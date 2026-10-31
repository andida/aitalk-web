#!/bin/bash
# Read-only production backup. Run locally; never paste a password into chat.
# This creates a sensitive private artifact OUTSIDE every source repository.
set -euo pipefail
umask 077

readonly pg_bin=/opt/homebrew/opt/libpq/bin
readonly backup_parent=/Users/andida/Documents/javastudy/aitalk/.private-backups
readonly expected_project=jkdhpfscpoahowolprco

if [[ ! -t 0 ]]; then
  echo 'Run this script in an interactive terminal; passwords must not be piped in.' >&2
  exit 1
fi
for command in psql pg_dump pg_restore; do
  [[ -x "$pg_bin/$command" ]] || { echo "Missing PostgreSQL tool: $command" >&2; exit 1; }
done

# Pin the verified project/session pooler. Never accept a user-supplied target URL.
export PGHOST=aws-0-ap-northeast-1.pooler.supabase.com
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER="postgres.$expected_project"
export PGSSLMODE=require
export PGCONNECT_TIMEOUT=15
export PGAPPNAME=aitalk-course-backup
export PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=900000'
unset PGSERVICE PGSERVICEFILE PGPASSFILE
unset PGPASSWORD

echo 'AITalk read-only backup: jkdhpfscpoahowolprco'
echo 'No password reset, SQL writes, migrations, imports or production restore.'
echo 'Enter the existing DATABASE password (not your Supabase website password).'
IFS= read -r -s -p 'Database password (hidden): ' course_password
printf '\n'
[[ -n "$course_password" ]] || { echo 'Cancelled: empty password.'; exit 1; }
export PGPASSWORD="$course_password"
unset course_password
trap 'unset PGPASSWORD' EXIT

# No retries on invalid credentials. Do not disclose table rows to the terminal.
"$pg_bin/psql" -X -w -v ON_ERROR_STOP=1 -Atc \
  "select 'Connected: ' || current_database() || ', server ' || current_setting('server_version');"

if [[ -L "$backup_parent" ]]; then
  echo 'Refusing a symlink backup destination.' >&2
  exit 1
fi
mkdir -p "$backup_parent"
chmod 700 "$backup_parent"
backup_dir=$(mktemp -d "$backup_parent/aitalk-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
backup_file="$backup_dir/database.dump.partial"
echo "Private destination: $backup_dir"

# pg_dump uses a consistent database snapshot. Abort on any permission/network error.
# Keep a failed .partial file for diagnosis; it is NOT a usable completed backup.
"$pg_bin/pg_dump" -w --format=custom --no-owner --no-privileges \
  --lock-wait-timeout=15000 --file="$backup_file"
"$pg_bin/pg_restore" --list "$backup_file" > "$backup_dir/archive-list.txt"
mv "$backup_file" "$backup_dir/database.dump"
unset PGPASSWORD
(
  cd "$backup_dir"
  shasum -a 256 database.dump > SHA256SUMS
  wc -c < database.dump > size-bytes.txt
)
echo "Backup created: $backup_dir/database.dump"
echo 'Archive readability checked. Isolated RESTORE IS NOT YET VERIFIED.'
echo 'Keep this folder private; never commit or upload it as source code.'
