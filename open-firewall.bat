@echo off
:: Self-elevating batch script to configure Windows Firewall for Hadkar Meals
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ==========================================================
echo Configuring Windows Firewall and Network for Hadkar Meals
echo ==========================================================

powershell -ExecutionPolicy Bypass -Command "Set-NetConnectionProfile -InterfaceIndex 15 -NetworkCategory Private"

netsh advfirewall firewall delete rule name="Hadkar Meals Frontend (5173)" >nul 2>&1
netsh advfirewall firewall add rule name="Hadkar Meals Frontend (5173)" dir=in action=allow protocol=TCP localport=5173 profile=any

netsh advfirewall firewall delete rule name="Hadkar Meals Backend (8081)" >nul 2>&1
netsh advfirewall firewall add rule name="Hadkar Meals Backend (8081)" dir=in action=allow protocol=TCP localport=8081 profile=any

echo.
echo ==========================================================
echo SUCCESS: Windows Firewall & Network profile configured!
echo.
echo 📱 Open this on your phone:
echo http://10.107.211.250:5173
echo ==========================================================
pause
