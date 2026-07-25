import os
import sys
import shutil
import subprocess
import xml.etree.ElementTree as ET

print("================================================================")
print(" SOCIALSPHERE - BUDOWANIE NATYWNEGO PLIKU APK DLA ANDROIDA")
print("================================================================")

build_env = r"C:\Users\asdsa\Desktop\stormradar\android-build-env"
project_dir = r"C:\Users\asdsa\Desktop\Antigravity"

jdk_dir = os.path.join(build_env, "jdk-17")
cmdline_tools_dir = os.path.join(build_env, "cmdline-tools")
gradle_dir = os.path.join(build_env, "gradle-8.7")
platform_tools_dir = os.path.join(build_env, "platform-tools")

# Set environment variables
os.environ["JAVA_HOME"] = jdk_dir
os.environ["ANDROID_HOME"] = build_env

new_path = f"{os.path.join(jdk_dir, 'bin')};{os.path.join(cmdline_tools_dir, 'latest', 'bin')};{platform_tools_dir};{os.path.join(gradle_dir, 'bin')};{os.environ.get('PATH', '')}"
os.environ["PATH"] = new_path

# 1. Icons directory
icons_dir = os.path.join(project_dir, "icons")
os.makedirs(icons_dir, exist_ok=True)

source_icon = os.path.join(project_dir, "assets", "icon.png")

# Copy mobile icons if available
for size in [36, 48, 72, 96, 144, 192, 512]:
    icon_dest = os.path.join(icons_dir, f"icon-{size}.png")
    shutil.copyfile(source_icon, icon_dest)

# 2. Cordova project path
cordova_proj = os.path.join(project_dir, "cordova-app")
if os.path.exists(cordova_proj):
    print("Czyszczenie poprzedniego projektu Cordova...")
    shutil.rmtree(cordova_proj, ignore_errors=True)

print("Tworzenie projektu Cordova SocialSphere...")
subprocess.run(["cordova.cmd", "create", cordova_proj, "pl.socialsphere.app", "SocialSphere"], check=True, shell=True)

# Copy WWW files
print("Kopiowanie zasobów (HTML/JS/CSS)...")
www_dir = os.path.join(cordova_proj, "www")
if os.path.exists(www_dir):
    shutil.rmtree(www_dir)
os.makedirs(www_dir, exist_ok=True)

shutil.copy(os.path.join(project_dir, "index.html"), os.path.join(www_dir, "index.html"))
shutil.copy(os.path.join(project_dir, "app.js"), os.path.join(www_dir, "app.js"))
shutil.copy(os.path.join(project_dir, "style.css"), os.path.join(www_dir, "style.css"))
shutil.copy(os.path.join(project_dir, "weryfikacja.html"), os.path.join(www_dir, "weryfikacja.html"))

assets_dir = os.path.join(project_dir, "assets")
if os.path.exists(assets_dir):
    shutil.copytree(assets_dir, os.path.join(www_dir, "assets"))

# Copy Android icons
icon_dir_android = os.path.join(cordova_proj, "res", "icon", "android")
os.makedirs(icon_dir_android, exist_ok=True)

shutil.copy(os.path.join(icons_dir, "icon-36.png"), os.path.join(icon_dir_android, "ldpi.png"))
shutil.copy(os.path.join(icons_dir, "icon-48.png"), os.path.join(icon_dir_android, "mdpi.png"))
shutil.copy(os.path.join(icons_dir, "icon-72.png"), os.path.join(icon_dir_android, "hdpi.png"))
shutil.copy(os.path.join(icons_dir, "icon-96.png"), os.path.join(icon_dir_android, "xhdpi.png"))
shutil.copy(os.path.join(icons_dir, "icon-144.png"), os.path.join(icon_dir_android, "xxhdpi.png"))
shutil.copy(os.path.join(icons_dir, "icon-192.png"), os.path.join(icon_dir_android, "xxxhdpi.png"))

# 3. Keystore certificate
keystore_path = os.path.join(project_dir, "socialsphere.keystore")
if not os.path.exists(keystore_path):
    print("Generowanie certyfikatu keystore...")
    keytool_bin = os.path.join(jdk_dir, "bin", "keytool.exe")
    subprocess.run([
        keytool_bin, "-genkey", "-v", "-keystore", keystore_path,
        "-alias", "socialsphere", "-keyalg", "RSA", "-keysize", "2048",
        "-validity", "10000", "-storepass", "SocialSphere2026!", "-keypass", "SocialSphere2026!",
        "-dname", "CN=SocialSphere, OU=App, O=SocialSphere, L=Warsaw, S=Mazovia, C=PL"
    ], check=True)

# 4. Cordova Android platform build
print("Dodawanie platformy Android...")
subprocess.run(["cordova.cmd", "platform", "add", "android"], cwd=cordova_proj, check=True, shell=True)

# Write build.json
keystore_abs = os.path.join(project_dir, "socialsphere.keystore").replace("\\", "/")
build_json_content = f"""{{
  "android": {{
    "release": {{
      "keystore": "{keystore_abs}",
      "storePassword": "SocialSphere2026!",
      "alias": "socialsphere",
      "password": "SocialSphere2026!",
      "keystoreType": "",
      "packageType": "apk"
    }}
  }}
}}"""

with open(os.path.join(cordova_proj, "build.json"), "w", encoding="utf-8") as f:
    f.write(build_json_content)

print("Kompilowanie instalacyjnego pliku APK (Release)...")
subprocess.run(["cordova.cmd", "build", "android", "--release", "--", "--packageType=apk"], cwd=cordova_proj, check=True, shell=True)

# Copy result APK
dist_apk_dir = os.path.join(project_dir, "dist-apk")
os.makedirs(dist_apk_dir, exist_ok=True)

apk_src = os.path.join(cordova_proj, "platforms", "android", "app", "build", "outputs", "apk", "release", "app-release.apk")
apk_dest = os.path.join(dist_apk_dir, "SocialSphere.apk")

if os.path.exists(apk_src):
    shutil.copyfile(apk_src, apk_dest)
    print("================================================================")
    print(" SUKCES! Gotowy plik APK zostal wygenerowany w:")
    print(f" {apk_dest}")
    print("================================================================")
else:
    print(f"Ostrzeżenie: Nie odnaleziono pliku w: {apk_src}")
