@echo off
echo Building Shop Analytics Dashboard Desktop App...
echo By zeeexshan - Commercial License Protected

REM Clear any previous builds
if exist dist-electron rmdir /s /q dist-electron
if exist dist rmdir /s /q dist

REM Set environment to prevent any native rebuilds
set ELECTRON_BUILDER_SKIP_REBUILD=true
set npm_config_build_from_source=false

echo Installing dependencies (no native scripts)...
npm ci --ignore-scripts --no-audit --no-fund

echo Building application...
npm run build

echo Obfuscating code...
npm run obfuscate

echo Building desktop app - ZERO NATIVE COMPILATION!
npm run build:desktop

echo Desktop build complete!
if exist dist-electron\*.exe (
    echo SUCCESS: Desktop app created in dist-electron folder
    echo Opening folder...
    explorer dist-electron
) else (
    echo BUILD FAILED: Check the output above for errors
)

pause