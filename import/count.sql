SELECT (SELECT COUNT(*) FROM cars) AS cars,
       (SELECT COUNT(*) FROM drivers) AS drivers,
       (SELECT COUNT(*) FROM queue) AS queue,
       (SELECT COUNT(*) FROM usage_records) AS usage_records;
