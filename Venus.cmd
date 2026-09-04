@echo off
rem ============================================================================
rem  Venus.cmd - double-click this.
rem
rem  Starts the yard's own server and opens it in a chromeless full-screen
rem  window. Not Electron, not a bundle, nothing installed: one node process
rem  and whichever Chromium browser is already on the machine.
rem
rem  Notes and feedback written in the app land in notes\ and feedback\ as
rem  real markdown files in this repository.
rem
rem  Close the window and then press a key here to stop the server.
rem ============================================================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   node is not on PATH, and the server needs it.
  echo   Install Node, or run:  python -m http.server 8777
  echo   ^(the python route serves the boards but has no notes or feedback^)
  echo.
  pause
  exit /b 1
)

echo.
echo   starting the yard...
start "venus-yard" /min cmd /c "node venus-app.mjs"

rem give the listener a moment before pointing a window at it
set /a _n=0
:wait
set /a _n+=1
powershell -NoProfile -Command "try{(New-Object Net.Sockets.TcpClient('127.0.0.1',8777)).Close();exit 0}catch{exit 1}" >nul 2>nul
if not errorlevel 1 goto up
if %_n% geq 25 goto slow
powershell -NoProfile -Command "Start-Sleep -Milliseconds 200" >nul
goto wait

:slow
echo   the server is slow to answer - opening anyway
:up

set "URL=http://localhost:8777/arcade.html"
set "FLAGS=--app=%URL% --start-fullscreen --disable-features=Translate --no-first-run"

rem whichever Chromium is already here. Edge ships with Windows, so it is first.
set "B=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%B%" goto launch
set "B=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%B%" goto launch
set "B=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%B%" goto launch
set "B=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%B%" goto launch

echo   no Edge or Chrome found - opening in the default browser instead
echo   ^(it will have browser chrome around it; everything else works^)
start "" "%URL%"
goto done

:launch
start "" "%B%" %FLAGS%

:done
echo.
echo   open      %URL%
echo   notes     %~dp0notes
echo   feedback  %~dp0feedback
echo.
echo   In the app:  ctrl+shift+N for a note, ctrl+shift+F for feedback.
echo   Both write markdown into this folder, which is how they reach Claude
echo   next session. F11 leaves full screen.
echo.
echo   Press any key to stop the server.
pause >nul
taskkill /fi "WINDOWTITLE eq venus-yard*" /t /f >nul 2>nul
echo   stopped.
endlocal
