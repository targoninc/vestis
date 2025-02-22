@echo off
echo Checking and installing required dependencies...

:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params = %*:"=""
    echo UAC.ShellExecute "cmd.exe", "/c %~s0 %params%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"
:--------------------------------------

:: Check if Git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Git is not installed. Installing Git...

    :: Download Git installer using PowerShell
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$url = 'https://api.github.com/repos/git-for-windows/git/releases/latest'; $release = Invoke-RestMethod -Uri $url; $asset = $release.assets | Where-Object { $_.name -like '*64-bit.exe' } | Select-Object -First 1; Write-Host ('Downloading Git ' + $release.tag_name); Invoke-WebRequest $asset.browser_download_url -OutFile 'git_installer.exe'"

    :: Install Git silently with default components
    start /wait git_installer.exe /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS

    :: Clean up installer
    del git_installer.exe

    :: Refresh environment variables
    setx PATH "%PATH%" /M

    echo Git has been installed.
) else (
    echo Git is already installed.
)

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 1337 (
    echo Node.js is not installed. Installing latest stable version...

    :: Get latest stable version and download installer using PowerShell with simplified syntax
    powershell -Command "$url = 'https://nodejs.org/dist/index.json'; $versions = Invoke-RestMethod -Uri $url; $latestStable = $versions | Where {$_.version -like '*22*'} | Select -First 1; $installerUrl = 'https://nodejs.org/dist/' + $latestStable.version + '/node-' + $latestStable.version + '-x64.msi'; Write-Host 'Downloading Node.js' $latestStable.version; Invoke-WebRequest $installerUrl -OutFile 'node_installer.msi'"

    :: Install Node.js silently
    msiexec /i node_installer.msi /qn

    :: Clean up installer
    del node_installer.msi

    :: Current path
    echo Current path:
    echo %PATH%

    :: Add Node.js to PATH
    setx PATH "%PATH%;C:\Program Files\nodejs" /M

    echo Node.js has been installed.
) else (
    echo Node.js is already installed.
)

:: Create a directory for the project
mkdir vestis_project 2>nul
cd vestis_project

:: Clone the repository
echo Cloning the Vestis repository...
git clone https://github.com/targoninc/vestis.git
if %ERRORLEVEL% NEQ 0 (
    echo Failed to clone repository.
    pause
    exit /b 1
)

cd vestis

:: Initialize and update submodules
echo Initializing submodules...
git submodule update --init
if %ERRORLEVEL% NEQ 0 (
    echo Failed to initialize submodules.
    pause
    exit /b 1
)

:: Install npm dependencies
echo Installing npm dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install npm dependencies.
    pause
    exit /b 1
)

:: Start the application
echo Starting the application...
start cmd /k "npm run start"

echo Installation and setup complete!
exit