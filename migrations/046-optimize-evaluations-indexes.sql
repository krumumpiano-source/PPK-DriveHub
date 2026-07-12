-- Optimize usage_records joins for evaluations and reports
CREATE INDEX IF NOT EXISTS idx_usage_records_queue_id ON usage_records(queue_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_record_type ON usage_records(record_type);
