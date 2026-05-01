Set-Location "d:\AI CURSER\ppk-drivehub"
git rm --cached driver-test.log 2>&1
git rm --cached driver-test2.log 2>&1
git rm --cached driver-test3.log 2>&1
git rm --cached driver-test4.log 2>&1
git add -A
git commit -m "fix(tests): remove hardcoded passwords in driver.spec.mjs + remove log files"
git push
Write-Host "Done"
