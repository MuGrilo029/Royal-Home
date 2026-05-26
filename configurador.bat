@echo off
setlocal
title Configurador Gestao Pro

echo ======================================================
echo   Configurador do Sistema Gestao Pro
echo ======================================================
echo.

:: Verifica se o Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo O Node.js e necessario para rodar este sistema.
    echo Por favor, faca o download e instale a versao LTS em:
    echo https://nodejs.org/
    echo.
    echo Apos instalar, feche esta janela e tente novamente.
    echo.
    pause
    exit /b
)

echo [OK] Node.js detectado.
echo.

:: Verifica se node_modules existe, se nao, instala
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias (isso pode levar alguns minutos)...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao instalar dependencias. Verifique sua conexao com a internet.
        pause
        exit /b
    )
    echo [OK] Dependencias instaladas com sucesso.
) else (
    echo [OK] Dependencias ja estao instaladas.
)

echo.
echo ======================================================
echo   Configuracao concluida!
echo   Criando atalho na Area de Trabalho...
echo ======================================================

set SCRIPT_NAME=Gestão Pro.vbs
set TARGET_PATH=%~dp0%SCRIPT_NAME%
set ICON_PATH=%SystemRoot%\System32\perfmon.exe,0

:: Cria o atalho via PowerShell encontrando o Desktop real
powershell -NoProfile -Command ^
    "$desktop = [Environment]::GetFolderPath('Desktop');" ^
    "$s = (New-Object -ComObject WScript.Shell).CreateShortcut(\"$desktop\Gestão Pro.lnk\");" ^
    "$s.TargetPath = 'wscript.exe';" ^
    "$s.Arguments = '\"%TARGET_PATH%\"';" ^
    "$s.WorkingDirectory = '%~dp0';" ^
    "$s.IconLocation = '%ICON_PATH%';" ^
    "$s.Description = 'Sistema de Gestão Comercial';" ^
    "$s.Save()"

echo.
echo [OK] Atalho criado na sua Area de Trabalho!
echo.
echo Para iniciar o sistema:
echo 1. Clique duas vezes no ícone "Gestão Pro" na sua Área de Trabalho.
echo 2. O servidor iniciará em segundo plano (ícone na bandeja perto do relógio).
echo 3. O navegador será aberto automaticamente em http://localhost:3000.
echo.
echo Pressione qualquer tecla para sair...
pause >nul
