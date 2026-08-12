@echo off
rem ============================================================================
rem  build.bat - compile the SriniMart C++ recommendation model.
rem  Requires g++ (MinGW-w64 / MSYS2 / any GCC) on PATH.
rem  Usage:  build.bat
rem ============================================================================
g++ -O2 -std=c++17 recommender.cpp -I. -o recommender.exe
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed. Install g++ and add it to PATH, e.g.:
    echo   winget install mingw    or install MSYS2 and add "C:\msys64\mingw64\bin" to PATH
    exit /b 1
)
echo.
echo Build OK. Run it with:
echo   recommender.exe products.json recommendations.json 5
