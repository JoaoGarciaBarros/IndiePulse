Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot

# --- Inicia backend (sem janela) ---
$backend = Start-Process `
    -FilePath "$root\rage-backend\.venv\Scripts\python.exe" `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" `
    -WorkingDirectory "$root\rage-backend" `
    -WindowStyle Hidden `
    -PassThru

Start-Sleep -Seconds 2

# --- Inicia frontend (sem janela) ---
$frontend = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory "$root\rage-button" `
    -WindowStyle Hidden `
    -PassThru

# --- Popup ---
$form = New-Object System.Windows.Forms.Form
$form.Text = "RageTrigger"
$form.Size = New-Object System.Drawing.Size(300, 220)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(10, 10, 20)
$form.ForeColor = [System.Drawing.Color]::White

$icon = [System.Drawing.SystemIcons]::Application
$form.Icon = $icon

# Titulo
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "RAGETRIGGER"
$lblTitle.Font = New-Object System.Drawing.Font("Consolas", 14, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$lblTitle.AutoSize = $true
$lblTitle.Location = New-Object System.Drawing.Point(20, 16)

# Status
$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Sistema rodando..."
$lblStatus.Font = New-Object System.Drawing.Font("Consolas", 8)
$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(100, 220, 100)
$lblStatus.AutoSize = $true
$lblStatus.Location = New-Object System.Drawing.Point(20, 50)

# URLs
$lblFront = New-Object System.Windows.Forms.LinkLabel
$lblFront.Text = "Frontend   http://localhost:5173"
$lblFront.Font = New-Object System.Drawing.Font("Consolas", 8)
$lblFront.ForeColor = [System.Drawing.Color]::FromArgb(150, 200, 255)
$lblFront.LinkColor = [System.Drawing.Color]::FromArgb(150, 200, 255)
$lblFront.ActiveLinkColor = [System.Drawing.Color]::White
$lblFront.AutoSize = $true
$lblFront.Location = New-Object System.Drawing.Point(20, 80)
$lblFront.Add_LinkClicked({ Start-Process "http://localhost:5173" })

$lblBack = New-Object System.Windows.Forms.LinkLabel
$lblBack.Text = "Backend    http://localhost:8000"
$lblBack.Font = New-Object System.Drawing.Font("Consolas", 8)
$lblBack.ForeColor = [System.Drawing.Color]::FromArgb(150, 200, 255)
$lblBack.LinkColor = [System.Drawing.Color]::FromArgb(150, 200, 255)
$lblBack.ActiveLinkColor = [System.Drawing.Color]::White
$lblBack.AutoSize = $true
$lblBack.Location = New-Object System.Drawing.Point(20, 100)
$lblBack.Add_LinkClicked({ Start-Process "http://localhost:8000/docs" })

$lblDocs = New-Object System.Windows.Forms.LinkLabel
$lblDocs.Text = "API Docs   http://localhost:8000/docs"
$lblDocs.Font = New-Object System.Drawing.Font("Consolas", 8)
$lblDocs.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 120)
$lblDocs.LinkColor = [System.Drawing.Color]::FromArgb(120, 120, 120)
$lblDocs.ActiveLinkColor = [System.Drawing.Color]::White
$lblDocs.AutoSize = $true
$lblDocs.Location = New-Object System.Drawing.Point(20, 120)
$lblDocs.Add_LinkClicked({ Start-Process "http://localhost:8000/docs" })

# Botao parar
$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "Parar Sistema"
$btnStop.Font = New-Object System.Drawing.Font("Consolas", 9, [System.Drawing.FontStyle]::Bold)
$btnStop.Size = New-Object System.Drawing.Size(260, 34)
$btnStop.Location = New-Object System.Drawing.Point(20, 155)
$btnStop.BackColor = [System.Drawing.Color]::FromArgb(180, 30, 30)
$btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.FlatStyle = "Flat"
$btnStop.FlatAppearance.BorderSize = 0
$btnStop.Add_Click({ $form.Close() })

$form.Controls.AddRange(@($lblTitle, $lblStatus, $lblFront, $lblBack, $lblDocs, $btnStop))

$form.Add_FormClosed({
    taskkill /F /T /PID $backend.Id  2>$null | Out-Null
    taskkill /F /T /PID $frontend.Id 2>$null | Out-Null
})

[void]$form.ShowDialog()
