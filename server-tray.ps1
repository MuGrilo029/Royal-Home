Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Configurações Iniciais
$projectName = "Gestão Pro"
$serverUrl = "http://localhost:3000"
$logFile = Join-Path $PSScriptRoot "server.log"
$serverProcessId = $null

# Função para parar o servidor iniciado por este script e liberar a porta 3000
function Stop-Server {
    # 1. Tenta parar pelo PID capturado
    if ($serverProcessId) {
        try {
            # Mata a árvore de processos (incluindo o node iniciado pelo npm)
            Get-CimInstance Win32_Process -Filter "ParentProcessId = $serverProcessId" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            Stop-Process -Id $serverProcessId -Force -ErrorAction SilentlyContinue
            $global:serverProcessId = $null
        } catch {}
    }

    # 2. Garante que nada ficou na porta 3000 (instâncias órfãs)
    try {
        $portProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
        if ($portProcess) {
            $pids = $portProcess.OwningProcess | Select-Object -Unique
            foreach ($p in $pids) {
                if ($p -ne $PID) { # Evita matar a si mesmo
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {}
}

# Função para iniciar o servidor
function Start-Server {
    Stop-Server
    
    # Limpa log antigo e garante que o arquivo exista
    "--- Inicio do Log: $(Get-Date) ---" | Out-File $logFile -Encoding utf8
    
    # Inicia o servidor usando a sintaxe de redirecionamento do CMD, que e mais robusta para batch files
    # Usamos o operado > para redirecionar stdout e 2>&1 para redirecionar stderr para o mesmo lugar
    $cmdLine = "/c npm.cmd run dev > ""$logFile"" 2>&1"
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdLine -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru
    $global:serverProcessId = $process.Id
}

# Função para esperar a porta 3000 estar ativa
function Wait-For-Port {
    param($port, $timeoutSeconds = 60)
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds) {
        $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($connection) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

# Ícone da Bandeja
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon("$env:SystemRoot\system32\perfmon.exe")
$notifyIcon.Text = "Gestão Pro"
$notifyIcon.Visible = $true

# Menu de Contexto
$contextMenu = New-Object System.Windows.Forms.ContextMenu
$itemAbrir = New-Object System.Windows.Forms.MenuItem("Abrir no Navegador")
$itemLogs = New-Object System.Windows.Forms.MenuItem("Ver Logs do Servidor")
$itemReiniciar = New-Object System.Windows.Forms.MenuItem("Reiniciar Servidor")
$itemPasta = New-Object System.Windows.Forms.MenuItem("Abrir Pasta do Projeto")
$itemSair = New-Object System.Windows.Forms.MenuItem("Encerrar Servidor")

$itemAbrir.Add_Click({ 
    try {
        Start-Process $serverUrl
    } catch {
        Start-Process "explorer.exe" -ArgumentList $serverUrl
    }
})
$itemLogs.Add_Click({ Start-Process "notepad.exe" -ArgumentList $logFile })
$itemReiniciar.Add_Click({ 
    $notifyIcon.ShowBalloonTip(2000, "Gestao Pro", "Reiniciando servidor...", [System.Windows.Forms.ToolTipIcon]::Info)
    Start-Server
    if (Wait-For-Port 3000) {
        $notifyIcon.ShowBalloonTip(3000, "Gestao Pro", "Servidor Pronto!", [System.Windows.Forms.ToolTipIcon]::Info)
    }
})
$itemPasta.Add_Click({ Start-Process "explorer.exe" -ArgumentList $PSScriptRoot })
$itemSair.Add_Click({
    Stop-Server
    $notifyIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
    Stop-Process -Id $PID
})

$contextMenu.MenuItems.Add($itemAbrir)
$contextMenu.MenuItems.Add($itemLogs)
$contextMenu.MenuItems.Add($itemReiniciar)
$contextMenu.MenuItems.Add("-") # Separador
$contextMenu.MenuItems.Add($itemPasta)
$contextMenu.MenuItems.Add($itemSair)
$notifyIcon.ContextMenu = $contextMenu

# Inicia o servidor pela primeira vez
Start-Server

# Espera o servidor estar pronto antes de abrir o navegador
if (Wait-For-Port 3000) {
    try {
        Start-Process $serverUrl
    } catch {
        Start-Process "explorer.exe" -ArgumentList $serverUrl
    }
    $notifyIcon.ShowBalloonTip(3000, "Gestao Pro", "O sistema esta pronto e aberto.", [System.Windows.Forms.ToolTipIcon]::Info)
} else {
    $notifyIcon.ShowBalloonTip(5000, "Gestao Pro", "O servidor demorou para iniciar. Veja os logs.", [System.Windows.Forms.ToolTipIcon]::Error)
}

# Loop de Eventos
[System.Windows.Forms.Application]::Run()
