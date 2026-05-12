# analyze-csv-gaps.ps1
# วิเคราะห์ช่องว่างใน CSV ทั้ง 14 ไฟล์ และสร้าง SQL migration

$carIds = @{
  "40-0062" = "d1def56d-493a-47d6-a164-8d99c7ab44bd"
  "40-0158" = "4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3"
  "กจ 5192" = "97d66518-d511-4ae2-abcb-54a491b5f13c"
  "นข 1977" = "b43ad8e2-04d0-40e0-90ab-d598bf44282d"
  "นข 2455" = "d5685d4b-914f-4140-8de6-6050a514ae9b"
  "นข 358"  = "b7ee9471-dda3-45a5-94b0-605980a5214b"
  "นข 3816" = "df5fd5a5-287e-4e10-a8d0-f6818daa6522"
}

$driverIds = @{
  "นายณัฐวุฒิ ใหญ่วงค์"  = "b494cfd8-7cd6-4801-8e1f-db14de8866c7"  # นาย ณัฐวุฒิ ใหญ่วงศ์
  "นายณัฐวุฒิ ใหญ่วงศ์"  = "b494cfd8-7cd6-4801-8e1f-db14de8866c7"
  "นายสมชาย พรมศร"       = "0ac38057-2288-4cf8-a2a0-3303cb21be15"
  "นายสุรเชษฐ์  บุริวงศ์"  = "29954b0c-8089-4560-adad-f9d724fba7e4"
  "นายสุรเชษฐ์ บุริวงศ์"   = "29954b0c-8089-4560-adad-f9d724fba7e4"
  "นายชารี ศรีพรม"        = "91e0301c-4cd3-4cf5-ba0d-6c69788f9d5a"
  "นาย เปรมฤทธิ์ อินแต่ง"  = "c8f2c74e-bcab-47d2-9ea6-c6582faee618"
  "นายเปรมฤทธิ์ อินแต่ง (สำรอง4)" = "c8f2c74e-bcab-47d2-9ea6-c6582faee618"
  "นาย มานพ โลหะกิจ"      = "d4db9fee-d77e-4ea6-b979-0a180c865e62"
  "นายมานพ โลหะกิจ (สำรอง2)" = "d4db9fee-d77e-4ea6-b979-0a180c865e62"
  "นายสงกรานต์ แก้วสา (เฉพาะกิจ พัสดุ)" = "de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c"
  "นาย สงกรานต์ แก้วสา"   = "de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c"
  "นาย สหรัฐ พลับพลา"     = "6a6ff713-82d1-4bb7-9e83-233f8c866d63"
  "นายสหรัฐ พลับพลา (สำรอง5)" = "6a6ff713-82d1-4bb7-9e83-233f8c866d63"
  "นาย กันต์กวี ชัยทะ"    = "b4442829-6e5b-4275-bd46-f112c1d19b75"
  "นายกันต์กวี ชัยทะ (สำรอง1)" = "b4442829-6e5b-4275-bd46-f112c1d19b75"
  "นายสุมงคล จ่อยพิรัตน์" = $null  # ไม่มีใน DB
}

function Get-DriverId([string]$name) {
  $name = $name.Trim()
  foreach ($k in $driverIds.Keys) {
    if ($k.Trim() -eq $name) { return $driverIds[$k] }
  }
  # fuzzy: ตัด (สำรอง...) ออก แล้วหา
  $clean = $name -replace '\s*\(.*\)\s*$', '' -replace '\s+', ' '
  foreach ($k in $driverIds.Keys) {
    if ($k -replace '\s*\(.*\)\s*$', '' -replace '\s+', ' ' -eq $clean) { return $driverIds[$k] }
  }
  return $null
}

function New-UUID { return [System.Guid]::NewGuid().ToString() }

function Parse-CsvDate([string]$s) {
  $s = $s.Trim().Trim('"')
  if ($s -match '^(\d{1,2})/(\d{1,2})/(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?') {
    $d = [int]$Matches[1]; $m = [int]$Matches[2]; $y = [int]$Matches[3]
    $h = [int]$Matches[4]; $mn = [int]$Matches[5]; $sc = if ($Matches[6]) { [int]$Matches[6] } else { 0 }
    try { return [datetime]::new($y, $m, $d, $h, $mn, $sc) } catch { return $null }
  }
  return $null
}

function Format-SqlDt([datetime]$dt) { return $dt.ToString("yyyy-MM-ddTHH:mm:00") }

# Parse CSV row (handle quoted commas)
function Parse-CsvRow([string]$line) {
  $result = @()
  $inQuote = $false; $current = ""
  for ($i = 0; $i -lt $line.Length; $i++) {
    $c = $line[$i]
    if ($c -eq '"') { $inQuote = !$inQuote }
    elseif ($c -eq ',' -and !$inQuote) { $result += $current.Trim().Trim('"'); $current = "" }
    else { $current += $c }
  }
  $result += $current.Trim().Trim('"')
  return $result
}

$allFiles = @{
  "40-0062" = @("c:\Users\krumu\Downloads\สำเนาของ บันทึกการใช้รถ 40-0062 (การตอบกลับ) - บันทึกหลัก.csv",
                "c:\Users\krumu\Downloads\บันทึกการใช้รถ 40-0062 (การตอบกลับ) - บันทึกหลัก.csv")
  "40-0158" = @("c:\Users\krumu\Downloads\สำเนาของ บันทึกการใช้รถ 40-0158 (การตอบกลับ) - บันทึกหลัก.csv",
                "c:\Users\krumu\Downloads\บันทึกการใช้รถ 40-0158 (การตอบกลับ) - บันทึกหลัก.csv")
  "กจ 5192" = @("c:\Users\krumu\Downloads\สำเนาของ บันทึกการใช้รถ กจ 5192 (การตอบกลับ) - บันทึกหลัก.csv",
                "c:\Users\krumu\Downloads\บันทึกการใช้รถ กจ 5192 (การตอบกลับ) - บันทึกหลัก.csv")
  "นข 1977" = @("c:\Users\krumu\Downloads\สำเนาของ บันทึกการใช้รถ นข 1977 (การตอบกลับ) - บันทึกหลัก.csv",
                "c:\Users\krumu\Downloads\บันทึกการใช้รถ นข 1977 (การตอบกลับ) - บันทึกหลัก.csv")
  "นข 2455" = @("c:\Users\krumu\Downloads\สำเนาของ บันทึกการใช้รถ นข 2455 (การตอบกลับ) - บันทึกหลัก.csv",
                "c:\Users\krumu\Downloads\บันทึกการใช้รถ นข 2455 (การตอบกลับ) - บันทึกหลัก.csv")
  "นข 358"  = @("c:\Users\krumu\Downloads\สำเนาของ บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv",
                "c:\Users\krumu\Downloads\บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv")
  "นข 3816" = @("c:\Users\krumu\Downloads\สำเนาของ บันทึกการใช้รถ นข 3816 (การตอบกลับ) - บันทึกหลัก.csv",
                "c:\Users\krumu\Downloads\บันทึกการใช้รถ นข 3816 (การตอบกลับ) - บันทึกหลัก.csv")
}

# สะสม INSERT statements
$sqls = @("-- Migration 028: auto-fill missing records from CSV source")
$sqls += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$sqls += ""

$totalGaps = 0; $totalMissing = 0; $totalMileageGap = 0

foreach ($car in ($allFiles.Keys | Sort-Object)) {
  $carId = $carIds[$car]
  $sqls += "-- ===== $car ====="
  
  # รวมข้อมูลจาก 2 ไฟล์ (สำเนา + original) เป็น rows ตามลำดับเวลา
  $allRows = @()
  
  foreach ($file in $allFiles[$car]) {
    $lines = Get-Content $file -Encoding UTF8
    $prevMileage = 0; $prevDt = $null; $prevRow = $null
    
    for ($i = 1; $i -lt $lines.Count; $i++) {
      $line = $lines[$i]
      
      # GAP row: ,,ไม่มีการบันทึก,,,,,N
      if ($line -match '^,,ไม่มีการบันทึก') {
        $gapKm = ($line -split ',')[-1].Trim()
        $gapKm = if ($gapKm -match '^\d+$') { [int]$gapKm } else { 0 }
        if ($gapKm -gt 0 -and $prevDt -ne $null) {
          # หา next departure (บรรทัดถัดไปที่ไม่ใช่ gap)
          $nextLine = ""
          for ($j = $i+1; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match '^"') { $nextLine = $lines[$j]; break }
          }
          $nextRow = if ($nextLine) { Parse-CsvRow $nextLine } else { $null }
          $nextDt = if ($nextRow -and $nextRow[3] -notmatch 'ลืม') { Parse-CsvDate $nextRow[3] } else { $null }
          $nextDriver = if ($nextRow) { $nextRow[1] } else { ($prevRow[1]) }
          $nextDriverId = Get-DriverId $nextDriver
          if (-not $nextDriverId) { $nextDriverId = Get-DriverId ($prevRow[1]) }
          $driverIdSql = if ($nextDriverId) { "'$nextDriverId'" } else { "NULL" }
          
          # สร้าง datetime: departure = prevDt + 1min, return = nextDt - 1min (หรือ prevDt + 1hr ถ้าไม่มี next)
          $depDt = $prevDt.AddMinutes(1)
          $retDt = if ($nextDt) { $nextDt.AddMinutes(-1) } else { $prevDt.AddHours(1) }
          $depMile = $prevMileage
          $retMile = $prevMileage + $gapKm
          
          $queueId = New-UUID
          $depId = New-UUID
          $retId = New-UUID
          $depDtStr = Format-SqlDt $depDt
          $retDtStr = Format-SqlDt $retDt
          $dateStr = $depDt.ToString("yyyy-MM-dd")
          $timeStart = $depDt.ToString("HH:mm:00")
          $timeEnd = $retDt.ToString("HH:mm:00")
          
          $sqls += "INSERT OR IGNORE INTO queue (id,date,time_start,time_end,car_id,driver_id,status,mission,destination,created_at) VALUES ('$queueId','$dateStr','$timeStart','$timeEnd','$carId',$driverIdSql,'completed','ไม่มีการบันทึก (auto)','ไม่ทราบ',datetime('now'));"
          $sqls += "INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,queue_id,is_historical,data_quality,auto_notes,record_source,created_at) VALUES ('$depId','$carId',$driverIdSql,'departure','$depDtStr',$depMile,'$queueId',1,'no_record','ไม่มีการบันทึก: นำรถใช้งานโดยไม่มีบันทึก ($gapKm กม.)','csv_gap',datetime('now'));"
          $sqls += "INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,queue_id,is_historical,data_quality,auto_notes,record_source,created_at) VALUES ('$retId','$carId',$driverIdSql,'return','$retDtStr',$retMile,'$queueId',1,'no_record','ไม่มีการบันทึก: นำรถใช้งานโดยไม่มีบันทึก ($gapKm กม.)','csv_gap',datetime('now'));"
          $sqls += ""
          $totalGaps++
          Write-Host "[$car] GAP $gapKm km | $depDtStr → $retDtStr | mile $depMile→$retMile"
        }
        continue
      }
      
      if ($line -notmatch '^"') { continue }
      $row = Parse-CsvRow $line
      if ($row.Count -lt 7) { continue }
      
      $driver  = $row[1].Trim()
      $status  = $row[2].Trim()
      $dateRaw = $row[3].Trim()
      $dest    = $row[5].Trim()
      $mileStr = $row[6].Trim()
      $mile    = if ($mileStr -match '^\d+$') { [int]$mileStr } else { 0 }
      
      # Parse datetime - ถ้า "ลืมบันทึก" ให้ใช้ timestamp (col 0) แทน
      $isForget = $dateRaw -match 'ลืมบันทึก'
      $dt = if ($isForget) { Parse-CsvDate $row[0] } else { Parse-CsvDate $dateRaw }
      
      if ($status -eq 'ก่อนออกเดินทาง') {
        # ตรวจ mileage gap: dep > prev_ret + 1
        if ($prevMileage -gt 0 -and $mile -gt $prevMileage + 1 -and $prevDt -ne $null) {
          $gapKm = $mile - $prevMileage
          $driverId2 = Get-DriverId $driver
          $driverIdSql2 = if ($driverId2) { "'$driverId2'" } else { "NULL" }
          $depDt2 = $prevDt.AddMinutes(1)
          $retDt2 = if ($dt) { $dt.AddMinutes(-1) } else { $prevDt.AddHours(1) }
          $queueId2 = New-UUID; $depId2 = New-UUID; $retId2 = New-UUID
          $sqls += "-- MILEAGE GAP: $car | prev_ret=$prevMileage → dep=$mile (+$gapKm km)"
          $sqls += "INSERT OR IGNORE INTO queue (id,date,time_start,time_end,car_id,driver_id,status,mission,destination,created_at) VALUES ('$queueId2','$($depDt2.ToString("yyyy-MM-dd"))','$($depDt2.ToString("HH:mm:00"))','$($retDt2.ToString("HH:mm:00"))','$carId',$driverIdSql2,'completed','ไม่มีการบันทึก (auto - mileage gap)','ไม่ทราบ',datetime('now'));"
          $sqls += "INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,queue_id,is_historical,data_quality,auto_notes,record_source,created_at) VALUES ('$depId2','$carId',$driverIdSql2,'departure','$(Format-SqlDt $depDt2)',$prevMileage,'$queueId2',1,'no_record','ช่องว่างไมล์ $gapKm กม. ไม่มีบันทึก (auto)','csv_gap',datetime('now'));"
          $sqls += "INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,queue_id,is_historical,data_quality,auto_notes,record_source,created_at) VALUES ('$retId2','$carId',$driverIdSql2,'return','$(Format-SqlDt $retDt2)',$mile,'$queueId2',1,'no_record','ช่องว่างไมล์ $gapKm กม. ไม่มีบันทึก (auto)','csv_gap',datetime('now'));"
          $sqls += ""
          $totalMileageGap++
          Write-Host "[$car] MILE GAP $gapKm km | $($depDt2.ToString('yyyy-MM-dd')) | $prevMileage→$mile"
        }
        $prevRow = $row
      }
      elseif ($status -eq 'กลับมาจากเดินทาง' -or $isForget) {
        if ($mile -gt 0) { $prevMileage = $mile; $prevDt = $dt }
      }
    }
  }
  
  $sqls += ""
}

$sqls += "-- Total gaps filled: $totalGaps csv_gap, $totalMileageGap mileage_gap"
Write-Host "`n=== SUMMARY ==="
Write-Host "CSV gap rows: $totalGaps"
Write-Host "Mileage gap rows: $totalMileageGap"

# บันทึกเป็น migration file
$outFile = "d:\AI CURSER\ppk-drivehub\migrations\028-fill-csv-gaps.sql"
[System.IO.File]::WriteAllLines($outFile, $sqls, [System.Text.Encoding]::UTF8)
Write-Host "`nSaved to: $outFile"
Write-Host "Total SQL lines: $($sqls.Count)"
