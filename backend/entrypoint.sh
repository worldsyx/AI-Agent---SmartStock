#!/bin/bash
set -e

# Ensure SQLite file and storage directories exist with write permissions
mkdir -p database
touch database/database.sqlite
chmod -R 775 database storage bootstrap/cache 2>/dev/null || true

# Run database migrations and seed initial default data
php artisan migrate --force
php artisan db:seed --force

# Clear cache
php artisan config:clear
php artisan route:clear

# Start Laravel
echo "Starting Laravel server on port ${PORT:-8000}..."
exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
