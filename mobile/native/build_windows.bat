@echo off
REM Build script for Windows x64
REM Requires: CMake, Visual Studio 2019+, libsodium

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BUILD_DIR=%SCRIPT_DIR%build\windows

echo ========================================
echo Building CyxWiz FFI for Windows x64
echo ========================================

REM Check for CMake
where cmake >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: CMake not found. Please install CMake and add to PATH.
    exit /b 1
)

REM Create build directory
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

REM Configure
echo.
echo Configuring...
cmake -B "%BUILD_DIR%" -S "%SCRIPT_DIR%" ^
    -DCMAKE_BUILD_TYPE=Release ^
    -DCYXWIZ_HAS_CRYPTO=ON

if %ERRORLEVEL% neq 0 (
    echo ERROR: CMake configuration failed
    exit /b 1
)

REM Build
echo.
echo Building...
cmake --build "%BUILD_DIR%" --config Release

if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)

REM Copy output
set OUTPUT_DIR=%SCRIPT_DIR%..\windows
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo.
echo Copying output...
copy "%BUILD_DIR%\Release\cyxwiz_ffi.dll" "%OUTPUT_DIR%\" 2>nul
if not exist "%OUTPUT_DIR%\cyxwiz_ffi.dll" (
    copy "%BUILD_DIR%\cyxwiz_ffi.dll" "%OUTPUT_DIR%\"
)

echo.
echo ========================================
echo Build complete!
echo Output: %OUTPUT_DIR%\cyxwiz_ffi.dll
echo ========================================

endlocal
