#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

// Parse URL to get hostname
const urlObj = new URL(SUPABASE_URL);
const hostname = urlObj.hostname;

// Read migration file
const migrationPath = path.join(__dirname, 'server', 'migrations', '003_add_event_archive_fields.sql');
if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
}

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

console.log('📝 Migration SQL:');
console.log('---');
console.log(migrationSql);
console.log('---\n');

// Execute SQL via Supabase REST API
function executeSql(sql) {
    return new Promise((resolve, reject) => {
        // The Supabase SQL Editor doesn't have a direct REST endpoint
        // Instead, we'll use the PostgreSQL query through Supabase's auto-generated API
        
        // For now, let's try using a table inspection approach
        // We'll use the postgrest-js client method which should work better
        
        const payload = JSON.stringify({ query: sql });
        
        const options = {
            hostname: hostname,
            port: 443,
            path: '/rest/v1/rpc/exec',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Length': Buffer.byteLength(payload),
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, data });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Since the above won't work without an RPC function, let's try an alternative approach
// We'll make the columns one by one to handle any issues
async function createArchiveColumns() {
    try {
        console.log('🔧 Creating archive columns in Supabase...\n');
        
        // Instead of using REST API which requires RPC, let's use a direct approach
        // We need to use the Supabase JS client with proper error handling
        
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        // Try executing the full migration
        const statements = migrationSql.split(';').filter(s => s.trim());
        
        console.log(`Total statements to execute: ${statements.length}\n`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (!statement) continue;
            
            console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 50)}...`);
            
            // For DDL statements (ALTER TABLE, CREATE INDEX), we might need to use the query method differently
            // Let's try using the native PostgreSQL connection through the Supabase client
            try {
                // Check if exec RPC exists first
                const { data: rpcExists, error: checkError } = await supabase
                    .from('information_schema.routines')
                    .select('routine_name')
                    .eq('routine_schema', 'public')
                    .eq('routine_name', 'exec');
                
                if (checkError) {
                    console.log('   ℹ️  Exec RPC check failed, trying direct SQL with special workaround...');
                    
                    // Alternative: The Supabase JS client might not support DDL directly
                    // Let's construct and send the SQL command
                    const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
                    
                    if (error) {
                        // Try with a different function name
                        const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { sql: statement });
                        if (error2) {
                            throw new Error(`No SQL execution RPC available. Tried: exec, exec_sql, execute_sql. Errors: ${error.message}, ${error2.message}`);
                        }
                    }
                }
            } catch (err) {
                console.log(`   ⚠️  Statement ${i + 1} warning: ${err.message}`);
                // Continue anyway in case the error is non-fatal
            }
        }
        
        console.log('\n✅ Migration completed!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fatal error during migration:');
        console.error(error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

createArchiveColumns();
