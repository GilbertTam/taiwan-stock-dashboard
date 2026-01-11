#!/bin/bash
echo "=============== Running docker-entrypoint.sh ==============="

DEBUG_="$(tr [A-Z] [a-z] <<<"$DEBUG")"

echo "> Debug mode: $DEBUG_"

echo "> Django migrations"
python manage.py makemigrations
python manage.py migrate

echo "> Collect Static"
python manage.py collectstatic --noinput

echo "> Running server"
/usr/local/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
