# PPK DriveHub - แทนที่ YOUR_GAS_WEB_APP_URL ในทุกไฟล์ HTML
# ใช้หลัง Deploy GAS Web App แล้ว
# ตัวอย่าง: .\update-api-url.ps1 -ApiUrl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl
)

$files = Get-ChildItem -Path $PSScriptRoot -Filter *.html -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match 'YOUR_GAS_WEB_APP_URL') {
        $content = $content -replace "YOUR_GAS_WEB_APP_URL", $ApiUrl
        Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "Done. Check that no file still contains YOUR_GAS_WEB_APP_URL."
