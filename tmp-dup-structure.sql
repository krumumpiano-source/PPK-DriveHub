WITH dupg AS (
  SELECT car_id, date, time_start
  FROM queue WHERE notes LIKE '%QR (%'
  GROUP BY car_id, date, time_start HAVING count(*) > 1
)
SELECT q.id, q.car_id, q.date, q.time_start, q.time_end, q.status, q.created_at,
  (SELECT count(*) FROM usage_records u WHERE u.queue_id=q.id AND u.record_type='departure') AS ndep,
  (SELECT count(*) FROM usage_records u WHERE u.queue_id=q.id AND u.record_type='return') AS nret
FROM queue q
JOIN dupg ON q.car_id=dupg.car_id AND q.date=dupg.date AND q.time_start=dupg.time_start
WHERE q.notes LIKE '%QR (%'
ORDER BY q.car_id, q.date, q.time_start, q.created_at;
