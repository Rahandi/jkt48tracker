# Data dump

`jkt48tracker-data-2026-11-12.sql.gz` is a full MySQL dump (taken 2026-11-12) of the database:
`members`, `theater_schedules`, `theater_schedule_members`, `contributions` and `alembic_version`.

Note: the data was last synced from jkt48.com on 2026-07-27, so the newest show in it is from 2026-08-02.

Restore into an empty MySQL 8 database:

    gunzip -c jkt48tracker-data-2026-11-12.sql.gz | mysql -u USER -p DATABASE
