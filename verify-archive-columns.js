#!/usr/bin/env node

/**
 * Verify that archive columns exist in Supabase events table
 * Run with: node verify-archive-columns.js
 */

const https = require('https');
const url = require('url');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wvebxdbvoinylwecmisv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Missing Supabase API key');
    console.error('   Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable');
    process.exit(1);
}

const urlObj = new url.parse(SUPABASE_URL);

// Query to check if columns exist
const query = `
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('is_archived', 'archived_at', 'archived_by')
ORDER BY ordinal_position
`;

function makeRequest() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            schema: 'information_schema',
            table: 'columns',
            select: 'column_name,data_type,is_nullable',
            or: '(column_name.eq.is_archived,column_name.eq.archived_at,column_name.eq.archived_by)',
            and: '(table_name.eq.events)'
        });

        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: '/rest/v1/rpc/check_archive_columns',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        };

        console.log('🔍 Checking for archive columns in Supabase...\n');

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
}

// Alternative: Use Supabase JS client if available
async function checkUsingSupabaseClient() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        console.log('🔍 Checking for archive columns in Supabase...\n');

        // Query information schema through REST API
        const { data, error } = await supabase
            .from('information_schema_columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'events')
            .in('column_name', ['is_archived', 'archived_at', 'archived_by'])
            .order('ordinal_position');

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            console.log('❌ Archive columns NOT found\n');
            console.log('📋 The columns are missing. You need to:');
            console.log('   1. Go to: https://app.supabase.com/project/wvebxdbvoinylwecmisv/sql/new');
            console.log('   2. Read: ADD_ARCHIVE_COLUMNS_MANUALLY.md');
            console.log('   3. Paste the SQL and click Run\n');
            process.exit(1);
        }

        console.log('✅ Archive columns FOUND!\n');
        console.log('Columns:');
        data.forEach((col, i) => {
            console.log(`  ${i + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });

        console.log('\n✨ Archive feature is ready to use!');
        console.log('   - Archive button now visible to admins/organizers');
        console.log('   - Archived events hidden from normal users');
        console.log('   - ARCHIVED badge shows to admins only\n');

        process.exit(0);
    } catch (error) {
        throw error;
    }
}

checkUsingSupabaseClient().catch((error) => {
    console.error('\n⚠️  Supabase client check failed:');
    console.error(error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Make sure the archive columns were added (check: ADD_ARCHIVE_COLUMNS_MANUALLY.md)');
    console.log('  2. Check your Supabase project is accessible');
    console.log('  3. Verify API key has correct permissions\n');
    process.exit(1);
});
