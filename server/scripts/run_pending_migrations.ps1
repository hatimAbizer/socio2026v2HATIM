Set-Location "c:/projects/SOCIO/socioweb"

$tokenLine = Get-Content "client/.env.local" | Where-Object { $_ -like "SUPABASE_ACCESS_TOKEN=*" } | Select-Object -First 1
if (-not $tokenLine) {
  throw "SUPABASE_ACCESS_TOKEN not found in client/.env.local"
}

$token = $tokenLine.Substring("SUPABASE_ACCESS_TOKEN=".Length).Trim()
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$endpoint = "https://api.supabase.com/v1/projects/wvebxdbvoinylwecmisv/database/query"

function Invoke-MigrationSql {
  param(
    [string]$Name,
    [string]$SqlText
  )

  try {
    $body = @{ query = $SqlText } | ConvertTo-Json -Compress
    $null = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body
    [PSCustomObject]@{ migration = $Name; status = "ok"; error = "" }
  } catch {
    $errorMessage = $_.Exception.Message
    if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream) {
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        if ($responseBody) {
          $errorMessage = "$errorMessage | $responseBody"
        }
      } catch {
        # ignore response parse failures and keep the base error message
      }
    }

    [PSCustomObject]@{ migration = $Name; status = "failed"; error = $errorMessage }
  }
}

$results = @()

$allowOutsidersCompatSql = @"
alter table if exists public.fest
  add column if not exists allow_outsiders boolean default false;

alter table if exists public.fests
  add column if not exists allow_outsiders boolean default false;
"@
$results += Invoke-MigrationSql -Name "001_add_fest_allow_outsiders__compat" -SqlText $allowOutsidersCompatSql

$files = @(
  "003_add_admin_analytics_rpc_v1.sql",
  "003_add_event_archive_fields.sql",
  "004_departments_courses_data.sql",
  "006_add_notification_user_status.sql",
  "007_fix_notifications_schema.sql",
  "008_add_events_on_spot.sql",
  "009_add_department_hosted_at.sql",
  "010_add_fest_custom_fields.sql",
  "011_complete_database_sync.sql",
  "012_add_domain_scoped_roles.sql",
  "012_add_events_additional_requests.sql",
  "013_finance_workflow_foundation.sql",
  "016_create_department_school.sql",
  "017_add_organizing_school_to_events_fests.sql",
  "018_department_approval_routing.sql",
  "019_lifecycle_status_state_machine.sql",
  "020_scope_alignment_and_event_budgets.sql",
  "020_remove_security_role.sql",
  "021_module11_complete_approval_algorithm.sql",
  "022_setup_rls_policies.sql",
  "023_fix_draft_status_consistency.sql",
  "024_keep_workflow_entities_in_draft.sql"
)

foreach ($file in $files) {
  $fullPath = Join-Path "server/migrations" $file
  if (-not (Test-Path $fullPath)) {
    $results += [PSCustomObject]@{ migration = $file; status = "failed"; error = "File not found" }
    continue
  }

  $sql = Get-Content $fullPath -Raw
  $results += Invoke-MigrationSql -Name $file -SqlText $sql
}

$fkSql = @"
alter table if exists public.users
  add column if not exists department_id uuid;

alter table if exists public.users
  drop constraint if exists fk_users_department;

alter table if exists public.users
  add constraint fk_users_department
  foreign key (department_id)
  references public.departments_courses(id)
  on update cascade
  on delete set null;

create index if not exists idx_users_department_id on public.users(department_id);
"@
$results += Invoke-MigrationSql -Name "005_link_users_to_departments__compat" -SqlText $fkSql

$results | Format-List

$failed = $results | Where-Object { $_.status -ne "ok" }
if ($failed.Count -gt 0) {
  Write-Output ""
  Write-Output "FAILED_MIGRATIONS:"
  $failed | Format-List
  exit 1
}
