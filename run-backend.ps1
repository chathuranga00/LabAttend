# LabAttend Backend Launcher for PowerShell
$ErrorActionPreference = "Stop"

# Detect Java 17+ / 21
$javaBin = $null
if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $javaBin = "$env:JAVA_HOME\bin\java.exe"
} elseif (Test-Path "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\java.exe") {
    $javaBin = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\java.exe"
} elseif (Test-Path "C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot\bin\java.exe") {
    $javaBin = "C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot\bin\java.exe"
} else {
    $javaBin = "java"
}

# Ensure working directory is backend
if (Test-Path "backend\target\labattend-backend-1.0.0.jar") {
    Set-Location "backend"
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Starting LabAttend Backend on http://localhost:8080" -ForegroundColor Green
Write-Host " Java runtime: $javaBin" -ForegroundColor Gray
Write-Host "=================================================" -ForegroundColor Cyan

& $javaBin -jar target/labattend-backend-1.0.0.jar
