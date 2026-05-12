-- Migration 023: Add authorization/approval fields for audit compliance
-- ระเบียบสำนักนายกรัฐมนตรีว่าด้วยรถราชการ พ.ศ. 2523 + ระเบียบเบิกจ่ายเดินทาง ก.คลัง 2550

-- การใช้รถ: ลำดับการอนุมัติ 3 ระดับ
ALTER TABLE queue ADD COLUMN travel_order_number TEXT;        -- เลขที่คำสั่งเดินทาง
ALTER TABLE queue ADD COLUMN purpose_category TEXT;           -- ราชการปกติ|ประชุม|อบรม|ศึกษาดูงาน|อื่นๆ
ALTER TABLE queue ADD COLUMN signed_vehicle_chief TEXT;       -- ① หัวหน้างานยานพาหนะ
ALTER TABLE queue ADD COLUMN signed_deputy_director TEXT;     -- ② รองผอ.ฝ่ายบริหาร
ALTER TABLE queue ADD COLUMN signed_director TEXT;            -- ③ ผอ.รร.

-- น้ำมัน: หัวหน้าพัสดุเซ็นอนุมัติ
ALTER TABLE fuel_log ADD COLUMN signed_supply_chief TEXT;     -- หัวหน้าพัสดุ

-- ผู้ใช้งาน: ตำแหน่งงาน (ออกในรายงาน สตง.)
ALTER TABLE users ADD COLUMN position TEXT;
