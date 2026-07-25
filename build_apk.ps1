$ErrorActionPreference = "Stop"

$buildEnv = "c:\Users\asdsa\Desktop\stormradar\android-build-env"
$projectDir = "c:\Users\asdsa\Desktop\Antigravity"

Write-Host "================================================================"
Write-Host " 🚀 SOCIALSPHERE — BUDOWANIE NATYWNEGO PLIKU APK DLA ANDROIDA"
Write-Host "================================================================"

if (!(Test-Path $buildEnv)) {
    Write-Error "Nie znaleziono srodowiska build: $buildEnv"
}

$jdkDir = $buildEnv + "\jdk-17"
$cmdlineToolsDir = $buildEnv + "\cmdline-tools"
$gradleDir = $buildEnv + "\gradle-8.7"

$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $buildEnv

$pathAdd = $jdkDir + "\bin;" + $cmdlineToolsDir + "\latest\bin;" + $buildEnv + "\platform-tools;" + $gradleDir + "\bin;"
$env:PATH = $pathAdd + $env:PATH

# 1. Prepare mobile icons
$iconsDir = $projectDir + "\icons"
if (!(Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

Write-Host "Przygotowywanie ikonek mobilnych..."
Add-Type -AssemblyName System.Drawing
$sourceIconPath = $projectDir + "\assets\icon.png"
if (Test-Path $sourceIconPath) {
    $sizes = @(36, 48, 72, 96, 144, 192, 512)
    $srcImg = [System.Drawing.Image]::FromFile($sourceIconPath)
    foreach ($sz in $sizes) {
        $outFileName = "icon-" + $sz + ".png"
        $destPath = $iconsDir + "\" + $outFileName
        $bmp = New-Object System.Drawing.Bitmap($srcImg, $sz, $sz)
        $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
    $srcImg.Dispose()
}

# 2. Create Cordova Project
$cordovaProj = $projectDir + "\cordova-app"
if (Test-Path $cordovaProj) {
    Write-Host "Czyszczenie poprzedniego projektu Cordova..."
    Remove-Item -Recurse -Force $cordovaProj
}

Write-Host "Tworzenie projektu Cordova SocialSphere..."
& cordova.cmd create $cordovaProj pl.socialsphere.app SocialSphere

# Copy assets
Write-Host "Kopiowanie zasobow (HTML/JS/CSS)..."
$wwwDir = $cordovaProj + "\www"
if (Test-Path $wwwDir) { Remove-Item -Recurse -Force $wwwDir }
New-Item -ItemType Directory -Path $wwwDir | Out-Null

Copy-Item ($projectDir + "\index.html") ($wwwDir + "\")
Copy-Item ($projectDir + "\app.js") ($wwwDir + "\")
Copy-Item ($projectDir + "\style.css") ($wwwDir + "\")
Copy-Item ($projectDir + "\weryfikacja.html") ($wwwDir + "\")
if (Test-Path ($projectDir + "\assets")) {
    Copy-Item ($projectDir + "\assets") ($wwwDir + "\assets") -Recurse
}

# Copy icons to res directory
$resDir = $cordovaProj + "\res"
if (!(Test-Path $resDir)) { New-Item -ItemType Directory -Path $resDir | Out-Null }
$iconDir = $resDir + "\icon\android"
if (!(Test-Path $iconDir)) { New-Item -ItemType Directory -Path $iconDir | Out-Null }

Copy-Item ($iconsDir + "\icon-36.png") ($iconDir + "\ldpi.png")
Copy-Item ($iconsDir + "\icon-48.png") ($iconDir + "\mdpi.png")
Copy-Item ($iconsDir + "\icon-72.png") ($iconDir + "\hdpi.png")
Copy-Item ($iconsDir + "\icon-96.png") ($iconDir + "\xhdpi.png")
Copy-Item ($iconsDir + "\icon-144.png") ($iconDir + "\xxhdpi.png")
Copy-Item ($iconsDir + "\icon-192.png") ($iconDir + "\xxxhdpi.png")

# 3. Generate Keystore
$keystorePath = $projectDir + "\socialsphere.keystore"
if (!(Test-Path $keystorePath)) {
    Write-Host "Generowanie certyfikatu keystore..."
    & ($jdkDir + "\bin\keytool.exe") -genkey -v -keystore $keystorePath -alias socialsphere -keyalg RSA -keysize 2048 -validity 10000 -storepass SocialSphere2026! -keypass SocialSphere2026! -dname "CN=SocialSphere, OU=App, O=SocialSphere, L=Warsaw, S=Mazovia, C=PL"
}

# 4. Add Android platform & build
Write-Host "Dodawanie platformy Android..."
Set-Location $cordovaProj
& cordova.cmd platform add android

$buildJsonPath = $cordovaProj + "\build.json"
$buildJsonContent = @'
{
  "android": {
    "release": {
      "keystore": "../../socialsphere.keystore",
      "storePassword": "SocialSphere2026!",
      "alias": "socialsphere",
      "password": "SocialSphere2026!",
      "keystoreType": "",
      "packageType": "apk"
    }
  }
}
'@
Set-Content -Path $buildJsonPath -Value $buildJsonContent

Write-Host "Kompilowanie instalacyjnego pliku APK (Release)..."
& cordova.cmd build android --release -- --packageType=apk

$distApkDir = $projectDir + "\dist-apk"
if (!(Test-Path $distApkDir)) {
    New-Item -ItemType Directory -Path $distApkDir | Out-Null
}

$apkSrc = $cordovaProj + "\platforms\android\app\build\outputs\apk\release\app-release.apk"
$apkDest = $distApkDir + "\SocialSphere.apk"

Set-Location $projectDir

if (Test-Path $apkSrc) {
    Copy-Item $apkSrc $apkDest -Force
    Write-Host "================================================================"
    Write-Host " SUKCES! Gotowy plik APK zostal wygenerowany w:"
    Write-Host " $apkDest"
    Write-Host "================================================================"
} else {
    Write-Host "Ostrzezenie: Plik APK nie zostal odnaleziony."
}
