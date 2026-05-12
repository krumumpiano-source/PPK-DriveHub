#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analyze-csv-gaps.py
วิเคราะห์ช่องว่างใน CSV ทั้ง 14 ไฟล์ และสร้าง SQL migration
"""
import csv, uuid, sys, re
from datetime import datetime, timedelta

# ==================== ID MAPPINGS ====================
CAR_IDS = {
    "40-0062": "d1def56d-493a-47d6-a164-8d99c7ab44bd",
    "40-0158": "4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3",
    "กจ 5192": "97d66518-d511-4ae2-abcb-54a491b5f13c",
    "นข 1977": "b43ad8e2-04d0-40e0-90ab-d598bf44282d",
    "นข 2455": "d5685d4b-914f-4140-8de6-6050a514ae9b",
    "นข 358":  "b7ee9471-dda3-45a5-94b0-605980a5214b",
    "นข 3816": "df5fd5a5-287e-4e10-a8d0-f6818daa6522",
}

DRIVER_IDS = {
    "นายณัฐวุฒิ ใหญ่วงค์":   "b494cfd8-7cd6-4801-8e1f-db14de8866c7",
    "นายณัฐวุฒิ ใหญ่วงศ์":   "b494cfd8-7cd6-4801-8e1f-db14de8866c7",
    "นาย ณัฐวุฒิ ใหญ่วงศ์":  "b494cfd8-7cd6-4801-8e1f-db14de8866c7",
    "นายสมชาย พรมศร":        "0ac38057-2288-4cf8-a2a0-3303cb21be15",
    "นายสุรเชษฐ์  บุริวงศ์":  "29954b0c-8089-4560-adad-f9d724fba7e4",
    "นายสุรเชษฐ์ บุริวงศ์":   "29954b0c-8089-4560-adad-f9d724fba7e4",
    "นายชารี ศรีพรม":         "91e0301c-4cd3-4cf5-ba0d-6c69788f9d5a",
    # เปรมฤทธิ์ = สำรอง4
    "นาย เปรมฤทธิ์ อินแต่ง":  "c8f2c74e-bcab-47d2-9ea6-c6582faee618",
    "นายเปรมฤทธิ์ อินแต่ง":   "c8f2c74e-bcab-47d2-9ea6-c6582faee618",
    # มานพ = สำรอง2
    "นาย มานพ โลหะกิจ":       "d4db9fee-d77e-4ea6-b979-0a180c865e62",
    "นายมานพ โลหะกิจ":        "d4db9fee-d77e-4ea6-b979-0a180c865e62",
    # สงกรานต์ = เฉพาะกิจ พัสดุ
    "นาย สงกรานต์ แก้วสา":    "de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c",
    "นายสงกรานต์ แก้วสา":     "de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c",
    "นายสงกรานต์ วัวสา":      "de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c",  # สะกดต่างกันในบาง CSV
    # สหรัฐ = สำรอง5
    "นาย สหรัฐ พลับพลา":      "6a6ff713-82d1-4bb7-9e83-233f8c866d63",
    "นายสหรัฐ พลับพลา":       "6a6ff713-82d1-4bb7-9e83-233f8c866d63",
    # กันต์กวี = สำรอง1
    "นาย กันต์กวี ชัยทะ":     "b4442829-6e5b-4275-bd46-f112c1d19b75",
    "นายกันต์กวี ชัยทะ":      "b4442829-6e5b-4275-bd46-f112c1d19b75",
    # เพิ่มเติมจาก CSV
    "นาย เกรียง กุศลมา":      "2822d25f-e6a0-4b91-81f0-124b4b82dd41",
    "นายเกรียง กุศลมา":       "2822d25f-e6a0-4b91-81f0-124b4b82dd41",
}

DRIVER_ALIAS = {
    "สำรอง": None,  # จะตัดส่วน (สำรอง...) ออกก่อน match
}

def normalize_driver_name(name: str) -> str:
    """normalize สำหรับ fuzzy match: ตัด (สำรอง/เฉพาะกิจ/...) + normalize spaces"""
    n = re.sub(r'\s*\([^)]*\)\s*$', '', name).strip()
    n = re.sub(r'\s+', ' ', n)
    # normalize นาย/นาง/นางสาว: remove space after title
    n = re.sub(r'^(นาย|นาง|นางสาว)\s+', lambda m: m.group(1), n)
    return n

def get_driver_id(name: str) -> str | None:
    name = name.strip()
    if name in DRIVER_IDS:
        return DRIVER_IDS[name]
    norm = normalize_driver_name(name)
    for k, v in DRIVER_IDS.items():
        if normalize_driver_name(k) == norm:
            return v
    return None

MAX_MILE = 600_000      # ไมล์สูงสุดที่ถือว่า valid (กม.)
MAX_AUTO_GAP = 150     # ช่องว่างไมล์สูงสุดที่จะ auto-fill สำหรับ MILEAGE gaps (กม.)
                       # CSV explicit gaps ไม่มีขีดจำกัดนี้ เพราะยืนยันแล้ว

def parse_date(s: str) -> datetime | None:
    """Parse "D/M/YYYY, H:MM:SS" หรือ "D/M/YYYY, H:MM" """
    s = s.strip().strip('"')
    for fmt in ("%d/%m/%Y, %H:%M:%S", "%d/%m/%Y, %H:%M", "%d/%m/%Y,%H:%M:%S", "%d/%m/%Y,%H:%M"):
        try:
            return datetime.strptime(s, fmt)
        except:
            pass
    return None

def fmt_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:00")

def new_uuid() -> str:
    return str(uuid.uuid4())

def q_insert(queue_id, date_str, ts, te, car_id, driver_id_sql, mission, dest):
    return (f"INSERT OR IGNORE INTO queue (id,date,time_start,time_end,car_id,driver_id,status,mission,destination,created_at,updated_at) "
            f"VALUES ('{queue_id}','{date_str}','{ts}','{te}','{car_id}',{driver_id_sql},"
            f"'completed','{mission}','{dest}',datetime('now'),datetime('now'));")

def ur_insert(rec_id, car_id, driver_id_sql, rec_type, dt_str, mile, queue_id, note):
    return (f"INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,"
            f"queue_id,is_historical,data_quality,auto_notes,record_source,created_at) "
            f"VALUES ('{rec_id}','{car_id}',{driver_id_sql},'{rec_type}','{dt_str}',{mile},"
            f"'{queue_id}',1,'no_record','{note}','csv_gap',datetime('now'));")

# ==================== FILES ====================
DOWNLOADS = r"c:\Users\krumu\Downloads"
CARS_FILES = {
    "40-0062": [
        f"{DOWNLOADS}/สำเนาของ บันทึกการใช้รถ 40-0062 (การตอบกลับ) - บันทึกหลัก.csv",
        f"{DOWNLOADS}/บันทึกการใช้รถ 40-0062 (การตอบกลับ) - บันทึกหลัก.csv",
    ],
    "40-0158": [
        f"{DOWNLOADS}/สำเนาของ บันทึกการใช้รถ 40-0158 (การตอบกลับ) - บันทึกหลัก.csv",
        f"{DOWNLOADS}/บันทึกการใช้รถ 40-0158 (การตอบกลับ) - บันทึกหลัก.csv",
    ],
    "กจ 5192": [
        f"{DOWNLOADS}/สำเนาของ บันทึกการใช้รถ กจ 5192 (การตอบกลับ) - บันทึกหลัก.csv",
        f"{DOWNLOADS}/บันทึกการใช้รถ กจ 5192 (การตอบกลับ) - บันทึกหลัก.csv",
    ],
    "นข 1977": [
        f"{DOWNLOADS}/สำเนาของ บันทึกการใช้รถ นข 1977 (การตอบกลับ) - บันทึกหลัก.csv",
        f"{DOWNLOADS}/บันทึกการใช้รถ นข 1977 (การตอบกลับ) - บันทึกหลัก.csv",
    ],
    "นข 2455": [
        f"{DOWNLOADS}/สำเนาของ บันทึกการใช้รถ นข 2455 (การตอบกลับ) - บันทึกหลัก.csv",
        f"{DOWNLOADS}/บันทึกการใช้รถ นข 2455 (การตอบกลับ) - บันทึกหลัก.csv",
    ],
    "นข 358": [
        f"{DOWNLOADS}/สำเนาของ บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv",
        f"{DOWNLOADS}/บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv",
    ],
    "นข 3816": [
        f"{DOWNLOADS}/สำเนาของ บันทึกการใช้รถ นข 3816 (การตอบกลับ) - บันทึกหลัก.csv",
        f"{DOWNLOADS}/บันทึกการใช้รถ นข 3816 (การตอบกลับ) - บันทึกหลัก.csv",
    ],
}

# ==================== MAIN LOGIC ====================
sqls = [
    "-- Migration 028: auto-fill missing records from CSV source",
    f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    "-- Cases handled:",
    "-- 1. Gap rows (ไม่มีการบันทึกข้อมูล) in สำเนาของ files",
    "-- 2. Mileage gaps > 1km between consecutive records (all files)",
    "",
]

stats = {"csv_gap": 0, "mile_gap": 0, "forget_dep": 0}

for car, files in sorted(CARS_FILES.items()):
    car_id = CAR_IDS[car]
    sqls.append(f"-- ===== {car} (car_id={car_id}) =====")

    # parse all rows from both files in order
    prev_mile = 0
    prev_dt = None
    prev_driver = None
    
    for filepath in files:
        try:
            with open(filepath, encoding='utf-8-sig') as f:
                raw_lines = f.readlines()
        except:
            print(f"  [WARN] Cannot open {filepath}", file=sys.stderr)
            continue

        # parse line by line (handle gap rows manually)
        for i, line in enumerate(raw_lines[1:], 1):  # skip header
            line = line.rstrip('\n').rstrip('\r')
            
            # ---- CASE 1: Gap row ----
            if line.startswith(',,'):
                parts = line.split(',')
                km_str = parts[-1].strip()
                gap_km = int(km_str) if km_str.isdigit() else 0
                if gap_km <= 0 or prev_dt is None:
                    continue
                
                # หา next non-gap row (ใช้ csv.reader เพื่อ handle quoted comma ใน timestamp)
                next_dt = None
                next_driver_name = prev_driver
                for j in range(i+1, len(raw_lines)):
                    nl = raw_lines[j].rstrip()
                    if nl.startswith('"'):
                        try:
                            nrow = next(csv.reader([nl]))
                            if len(nrow) >= 7:
                                nd_raw = nrow[3].strip()
                                if 'ลืม' not in nd_raw:
                                    next_dt = parse_date(nd_raw)
                                next_driver_name = nrow[1].strip() or prev_driver
                        except:
                            pass
                        break
                
                driver_id = get_driver_id(next_driver_name or '')
                if not driver_id and prev_driver:
                    driver_id = get_driver_id(prev_driver)
                if not driver_id:
                    print(f"  [{car}] SKIP csv_gap: unknown driver '{next_driver_name}' (prev='{prev_driver}')", file=sys.stderr)
                    prev_mile = ret_mile  # อัปเดต mileage แม้ skip
                    continue
                driver_sql = f"'{driver_id}'"
                
                dep_dt = prev_dt + timedelta(minutes=1)
                ret_dt = (next_dt - timedelta(minutes=1)) if next_dt else (prev_dt + timedelta(hours=1))
                dep_mile = prev_mile
                ret_mile = prev_mile + gap_km
                
                qid = new_uuid(); did = new_uuid(); rid = new_uuid()
                note = f"ไม่มีการบันทึก: นำรถใช้งาน {gap_km} กม. โดยไม่มีบันทึก"
                
                sqls.append(q_insert(qid, dep_dt.strftime("%Y-%m-%d"),
                    dep_dt.strftime("%H:%M:00"), ret_dt.strftime("%H:%M:00"),
                    car_id, driver_sql, "ไม่มีการบันทึก (auto)", "ไม่ทราบ"))
                sqls.append(ur_insert(did, car_id, driver_sql, 'departure',
                    fmt_dt(dep_dt), dep_mile, qid, note))
                sqls.append(ur_insert(rid, car_id, driver_sql, 'return',
                    fmt_dt(ret_dt), ret_mile, qid, note))
                sqls.append("")
                
                stats["csv_gap"] += 1
                print(f"  [{car}] CSV_GAP {gap_km}km @ {dep_dt.strftime('%Y-%m-%d')} mile {dep_mile}→{ret_mile}")
                
                prev_mile = ret_mile
                continue
            
            # ---- parse regular row ----
            if not line.startswith('"'):
                continue
            
            # parse CSV properly
            try:
                row = next(csv.reader([line]))
            except:
                continue
            if len(row) < 7:
                continue
            
            ts_raw, driver_name, status, date_raw, _, dest, mile_str = row[0], row[1], row[2], row[3], row[4], row[5], row[6]
            # validate: ต้องเป็นตัวเลขและไม่เกิน MAX_MILE (กรอง typo เช่น 301482301482)
            _m = int(mile_str) if mile_str.isdigit() else 0
            mile = _m if _m <= MAX_MILE else 0
            
            is_forget = 'ลืม' in date_raw
            dt = parse_date(ts_raw) if is_forget else parse_date(date_raw)
            
            if status == 'ก่อนออกเดินทาง':
                # CASE 2: mileage gap (เฉพาะ gap เล็ก <= MAX_AUTO_GAP และไม่ถอยหลัง)
                if prev_mile > 0 and mile > prev_mile + 1 and prev_dt is not None:
                    gap_km = mile - prev_mile
                    if gap_km > MAX_AUTO_GAP:
                        print(f"  [{car}] SKIP large MILE_GAP {gap_km}km @ dep {mile} (> {MAX_AUTO_GAP}km limit)", file=sys.stderr)
                        prev_driver = driver_name
                        continue
                    driver_id = get_driver_id(driver_name)
                    if not driver_id and prev_driver:
                        driver_id = get_driver_id(prev_driver)
                    if not driver_id:
                        print(f"  [{car}] SKIP mile_gap: unknown driver '{driver_name}'", file=sys.stderr)
                        prev_driver = driver_name
                        continue
                    driver_sql = f"'{driver_id}'"
                    dep_dt2 = prev_dt + timedelta(minutes=1)
                    ret_dt2 = (dt - timedelta(minutes=1)) if dt else (prev_dt + timedelta(hours=1))
                    qid2 = new_uuid(); did2 = new_uuid(); rid2 = new_uuid()
                    note2 = f"ช่องว่างไมล์: {prev_mile}→{mile} (+{gap_km} กม.) ไม่มีบันทึก"
                    
                    sqls.append(f"-- MILEAGE GAP {gap_km}km: {car} @ {dep_dt2.strftime('%Y-%m-%d')} mile {prev_mile}→{mile}")
                    sqls.append(q_insert(qid2, dep_dt2.strftime("%Y-%m-%d"),
                        dep_dt2.strftime("%H:%M:00"), ret_dt2.strftime("%H:%M:00"),
                        car_id, driver_sql, "ไม่มีการบันทึก (auto - mileage gap)", "ไม่ทราบ"))
                    sqls.append(ur_insert(did2, car_id, driver_sql, 'departure',
                        fmt_dt(dep_dt2), prev_mile, qid2, note2))
                    sqls.append(ur_insert(rid2, car_id, driver_sql, 'return',
                        fmt_dt(ret_dt2), mile, qid2, note2))
                    sqls.append("")
                    
                    stats["mile_gap"] += 1
                    print(f"  [{car}] MILE_GAP {gap_km}km @ {dep_dt2.strftime('%Y-%m-%d')} mile {prev_mile}→{mile}")
                
                prev_driver = driver_name

            elif status in ('กลับมาจากเดินทาง',) or is_forget:
                if mile > 0 and mile >= prev_mile:  # ไม่อัปเดตถ้าไมล์ถอยหลัง (data error)
                    prev_mile = mile
                    prev_dt = dt
                    prev_driver = driver_name
                elif mile > 0 and mile < prev_mile:
                    print(f"  [{car}] SKIP backward mile {mile} < prev {prev_mile} @ {date_raw[:20]}", file=sys.stderr)

    sqls.append("")

sqls.append(f"-- SUMMARY: {stats['csv_gap']} csv_gap + {stats['mile_gap']} mileage_gap records created")

out_path = r"d:\AI CURSER\ppk-drivehub\migrations\028-fill-csv-gaps.sql"
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sqls) + '\n')

print(f"\n=== DONE ===")
print(f"CSV gap rows:     {stats['csv_gap']}")
print(f"Mileage gap rows: {stats['mile_gap']}")
print(f"SQL saved to: {out_path}")
