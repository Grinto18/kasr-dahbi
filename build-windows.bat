@echo off
echo ========================================================
echo   Golden Palace POS - بناء تطبيق ويندوز المستقل (EXE)
echo ========================================================
echo.

echo 1. التحقق من تثبيت الحزم...
call npm install

echo.
echo 2. بناء الواجهة الامامية (Frontend)...
call npm run build

echo.
echo 3. تجميع Electron والسيرفر المحلي...
call npm run build:electron

echo.
echo 4. انشاء ملف التثبيت GoldenPalacePOS-Setup.exe...
call npx electron-builder --win --x64

echo.
echo ========================================================
echo تم الانتهاء بنجاح!
echo ستجد ملف التثبيت في المجلد: release\GoldenPalacePOS-Setup.exe
echo ========================================================
pause
