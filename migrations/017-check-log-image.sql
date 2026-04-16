-- Migration 017: check_log -- add check_image column for QR daily check photo
-- PPK DriveHub -- April 2026

ALTER TABLE check_log ADD COLUMN check_image TEXT;
-- R2 key ของรูปถ่ายประกอบการตรวจสภาพประจำวัน (optional)

