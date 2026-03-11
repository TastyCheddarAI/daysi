#!/bin/sh
set -e

echo "Running migrations..."

for file in /migrations/*.sql; do
  echo "Applying: $(basename $file)"
  psql "$DATABASE_URL" -f "$file"
done

echo "Migrations complete!"
