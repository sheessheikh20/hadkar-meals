# Configure Windows Firewall and Network Profile for Hadkar Meals

try {
    Write-Host "Setting active Wi-Fi profile to Private..." -ForegroundColor Cyan
    Set-NetConnectionProfile -InterfaceIndex 15 -NetworkCategory Private -ErrorAction Continue
} catch {
    Write-Warning "Could not change network category: $_"
}

try {
    Write-Host "Adding Inbound Firewall Rule for Frontend (Port 5173)..." -ForegroundColor Cyan
    Remove-NetFirewallRule -DisplayName "Hadkar Meals Frontend (5173)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Hadkar Meals Frontend (5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any
    Write-Host "Port 5173 Rule Added Successfully!" -ForegroundColor Green
} catch {
    Write-Warning "Failed to add Port 5173 rule: $_"
}

try {
    Write-Host "Adding Inbound Firewall Rule for Backend (Port 8081)..." -ForegroundColor Cyan
    Remove-NetFirewallRule -DisplayName "Hadkar Meals Backend (8081)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Hadkar Meals Backend (8081)" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow -Profile Any
    Write-Host "Port 8081 Rule Added Successfully!" -ForegroundColor Green
} catch {
    Write-Warning "Failed to add Port 8081 rule: $_"
}

Write-Host "`nVerifying Rules:" -ForegroundColor Yellow
Get-NetFirewallRule -DisplayName "Hadkar Meals*" | Select-Object DisplayName, Direction, Action, Enabled, Profile | Format-Table -AutoSize
