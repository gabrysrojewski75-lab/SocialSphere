@echo off
chcp 65001 >nul
title SocialSphere — Panel Weryfikacji

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          SocialSphere — Panel Weryfikacji            ║
echo  ║                Znaczek: ★ (gwiazdka)                 ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Otwieranie panelu weryfikacji w przegladarce...
echo.
echo  WAZNE: Panel musi byc otwarty w tej SAMEJ przegladarce,
echo  w ktorej uzywasz SocialSphere (ten sam localStorage).
echo.
echo  Klucz administratora: SocialSphere@2026Admin
echo.

:: Otwórz weryfikacja.html w domyślnej przeglądarce
start "" "%~dp0weryfikacja.html"

echo  Gotowe! Jezeli strona sie nie otworzy, otwórz reczenie:
echo  %~dp0weryfikacja.html
echo.
echo  Po nadaniu weryfikacji odswiez SocialSphere (F5).
echo.
pause
