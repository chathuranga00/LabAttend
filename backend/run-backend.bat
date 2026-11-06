@echo off
setlocal

rem Locate Java 17+ / Java 21 JDK
set "JAVA_BIN="
if exist "%JAVA_HOME%\bin\java.exe" set "JAVA_BIN=%JAVA_HOME%\bin\java.exe"
if not defined JAVA_BIN if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\java.exe" set "JAVA_BIN=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\java.exe"
if not defined JAVA_BIN if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot\bin\java.exe" set "JAVA_BIN=C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot\bin\java.exe"
if not defined JAVA_BIN set "JAVA_BIN=java"

rem Move into backend directory if in root
if exist "backend\target\labattend-backend-1.0.0.jar" (
    cd backend
)

echo Starting LabAttend Backend on http://localhost:8080 ...
echo Using Java: "%JAVA_BIN%"
"%JAVA_BIN%" -jar target\labattend-backend-1.0.0.jar

endlocal
