# SQL Migrations

This directory contains the new Aurora PostgreSQL migration path for the clinic OS platform.

Rules:

- these migrations represent the future AWS-owned transactional system of record
- they are separate from the retired managed-backend migration history that formerly lived under `supabase/migrations/`
- new platform schema work goes here
- legacy schema changes should be avoided unless strictly required for migration safety
