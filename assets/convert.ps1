Add-Type -AssemblyName System.Drawing
$src = "C:\Users\asdsa\.gemini\antigravity\brain\828d8a2c-4ee4-4518-9485-8e2e449fffe6\socialsphere_app_icon_1784972868055.jpg"
$dest = "c:\Users\asdsa\Desktop\Antigravity\assets\icon.png"
$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap($img, 256, 256)
$bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$bmp.Dispose()
Write-Host "PNG icon created successfully!"
