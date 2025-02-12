@echo off
REM paste.bat - Automatically downloads paste.js from REMOTE_URL and runs it.
REM Usage: paste.bat -c "Hello World" -p true -s "password" -e "2025-02-12T11:22:33Z" -h "https://cipher.ix.tc/"

REM Set the remote URL for paste.js (update this URL to where you host your paste.js file)
set "REMOTE_URL=https://raw.githubusercontent.com/Lettable/resources/refs/heads/main/cipher.js"

REM Set a temporary file location for paste.js
set "TEMP_FILE=%TEMP%\paste.js"

REM Download paste.js using PowerShell
powershell -NoProfile -Command "Invoke-WebRequest -Uri '%REMOTE_URL%' -OutFile '%TEMP_FILE%'"

REM Check if the file was downloaded successfully
if not exist "%TEMP_FILE%" (
    echo Error: Failed to download paste.js from %REMOTE_URL%.
    exit /b 1
)

REM Run the downloaded paste.js with Node.js passing all command-line arguments
node "%TEMP_FILE%" %*

REM Remove the temporary file
del "%TEMP_FILE%"
