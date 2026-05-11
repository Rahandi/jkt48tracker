#!/bin/sh
set -e
alembic upgrade head
exec fastapi run main.py
