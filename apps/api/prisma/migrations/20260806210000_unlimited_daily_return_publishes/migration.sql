-- Allow unlimited daily return publishes for the same date + return basis.
-- Idempotency remains via daily_return_runs.idempotency_key and per-wallet distribution keys.

DROP INDEX IF EXISTS "daily_return_runs_date_return_basis_key";
