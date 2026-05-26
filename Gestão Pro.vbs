Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtém o diretório onde o script está localizado
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Verifica Node.js
On Error Resume Next
Set objExec = WshShell.Exec("node -v")
If Err.Number <> 0 Then
    MsgBox "Node.js não encontrado! Por favor, instale o Node.js v18+ antes de continuar." & vbCrLf & _
           "Baixe em: https://nodejs.org/", 16, "Gestão Pro - Erro"
    Wscript.Quit
End If
On Error GoTo 0

' Verifica node_modules
If Not fso.FolderExists(strPath & "\node_modules") Then
    res = MsgBox("As dependências do sistema não foram encontradas." & vbCrLf & _
                 "Deseja tentar instalá-las agora? (Isso pode levar alguns minutos)", 33, "Gestão Pro - Configuração Inicial")
    If res = 1 Then
        ' Abre o cmd para mostrar o progresso da instalação
        WshShell.Run "cmd /c npm install && pause", 1, True
        ' Verifica novamente após a tentativa
        If Not fso.FolderExists(strPath & "\node_modules") Then
            MsgBox "A instalação parece ter falhado. Verifique sua conexão e tente rodar o 'configurador.bat' manualmente.", 48, "Erro de Configuração"
            Wscript.Quit
        End If
    Else
        Wscript.Quit
    End If
End If

' Inicia o Servidor na Bandeja (Escondido)
' Bypass execution policy para garantir que o script PS1 rode mesmo em PCs restritos
WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & strPath & "\server-tray.ps1""", 0
