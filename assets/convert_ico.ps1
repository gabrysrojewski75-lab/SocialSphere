Add-Type -AssemblyName System.Drawing
$pngPath = "c:\Users\asdsa\Desktop\Antigravity\assets\icon.png"
$icoPath = "c:\Users\asdsa\Desktop\Antigravity\assets\icon.ico"
$bmp = New-Object System.Drawing.Bitmap($pngPath)
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$stream = [System.IO.File]::Create($icoPath)
$icon.Save($stream)
$stream.Close()
$bmp.Dispose()
Write-Host "ICO icon created successfully!"
