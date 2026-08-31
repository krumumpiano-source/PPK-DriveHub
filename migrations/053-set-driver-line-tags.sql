-- Update driver LINE mention tags and ensure future-proof driver lifecycle
UPDATE drivers SET line_id = '@ชารี ศรีพรม' WHERE id = '91e0301c-4cd3-4cf5-ba0d-6c69788f9d5a' OR (first_name = 'ชารี' AND last_name = 'ศรีพรม');
UPDATE drivers SET line_id = '@ณัฐวุฒิ ใหญ่วงค์' WHERE id = 'b494cfd8-7cd6-4801-8e1f-db14de8866c7' OR (first_name = 'ณัฐวุฒิ' AND last_name = 'ใหญ่วงศ์');
UPDATE drivers SET line_id = '@Top' WHERE id = '0ac38057-2288-4cf8-a2a0-3303cb21be15' OR (first_name = 'สมชาย' AND last_name = 'พรมศร');
UPDATE drivers SET line_id = '@*poo diesel*' WHERE id = '29954b0c-8089-4560-adad-f9d724fba7e4' OR (first_name = 'สุรเชษฐ์' AND last_name = 'บุริวงศ์');
