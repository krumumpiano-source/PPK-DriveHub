-- Migration 048: Add index on usage_records(queue_id) for empirical API performance
-- Without this index, the double join in evaluations API causes a full table scan and 503 CPU timeout.

CREATE INDEX IF NOT EXISTS idx_usage_records_queue_id ON usage_records(queue_id);
