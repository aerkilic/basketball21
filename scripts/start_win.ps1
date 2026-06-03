Param()

$Root = Split-Path -Parent $PSScriptRoot

function Ensure-EnvFile($ExamplePath, $TargetPath) {
  if (-not (Test-Path $TargetPath)) {
    Copy-Item $ExamplePath $TargetPath
  }
}

function Resolve-LocalIp() {
  $localIp = $null
  # 1) Default-Route Interface bevorzugen (das eine, das wirklich ins Internet/WLAN geht)
  try {
    $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
             Sort-Object -Property RouteMetric, InterfaceMetric |
             Select-Object -First 1
    if ($route) {
      $ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
              $_.IPAddress -notlike '169.254.*' -and
              $_.IPAddress -ne '127.0.0.1'
            } |
            Select-Object -First 1 -ExpandProperty IPAddress
      if ($ip) { $localIp = $ip }
    }
  } catch {}
  # 2) Fallback: physischer Adapter mit RFC1918, virtuelle/WSL/Hyper-V/Docker-Adapter ausschliessen
  if (-not $localIp) {
    try {
      $localIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object {
          $_.IPAddress -notlike '169.254.*' -and
          $_.IPAddress -ne '127.0.0.1' -and
          ($_.IPAddress -like '192.168.*' -or
           $_.IPAddress -like '10.*' -or
           $_.IPAddress -match '^172\.(1[6-9]|2[0-9]|3[01])\.') -and
          $_.InterfaceAlias -notmatch '(?i)(vEthernet|Hyper-V|WSL|VMware|VirtualBox|Loopback|Bluetooth|Docker|Tailscale|ZeroTier)'
        } |
        Sort-Object -Property InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress
    } catch {}
  }
  return $localIp
}

function Resolve-MobileApiBaseUrl($MobileEnvPath) {
  $configured = ""
  if (Test-Path $MobileEnvPath) {
    $line = Get-Content $MobileEnvPath | Where-Object { $_ -match '^EXPO_PUBLIC_API_BASE_URL=' } | Select-Object -Last 1
    if ($line) {
      $configured = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
    }
  }

  if ($configured -and $configured -ne "auto") {
    return $configured
  }

  $localIp = Resolve-LocalIp

  if ($localIp) {
    return "http://$localIp`:8000"
  }

  return "http://localhost:8000"
}

function Resolve-BackendAllowedHosts($BackendEnvPath) {
  $configured = ""
  if (Test-Path $BackendEnvPath) {
    $line = Get-Content $BackendEnvPath | Where-Object { $_ -match '^DJANGO_ALLOWED_HOSTS=' } | Select-Object -Last 1
    if ($line) {
      $configured = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
    }
  }

  if (-not $configured) {
    $configured = "localhost,127.0.0.1"
  }
  if ($configured -match '\*') {
    return $configured
  }

  $localIp = Resolve-LocalIp

  if ($localIp) {
    $items = $configured.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    if ($items -notcontains $localIp) {
      $configured = "$configured,$localIp"
    }
  }
  return $configured
}

Write-Host "[1/4] Env-Dateien vorbereiten..."
Ensure-EnvFile "$Root/.env.example" "$Root/.env"
Ensure-EnvFile "$Root/backend/.env.example" "$Root/backend/.env"
Ensure-EnvFile "$Root/frontend/.env.example" "$Root/frontend/.env"
Ensure-EnvFile "$Root/mobile/.env.example" "$Root/mobile/.env"

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "[2/4] Starte PostgreSQL mit docker compose..."
  Push-Location $Root
  docker compose -f deploy/docker-compose.yml up -d postgres
  Pop-Location
} else {
  Write-Host "[2/4] Docker nicht gefunden, postgres uebersprungen."
}

Write-Host "[3/4] Starte Backend in neuem Fenster..."
$backendAllowedHosts = Resolve-BackendAllowedHosts "$Root/backend/.env"
Write-Host "[INFO] DJANGO_ALLOWED_HOSTS=$backendAllowedHosts"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root/backend'; $env:DJANGO_ALLOWED_HOSTS='$backendAllowedHosts'; if (Test-Path .venv) { $venv='.venv' } elseif (Test-Path venv) { $venv='venv' } else { python -m venv .venv; $venv='.venv' }; . ""$venv/Scripts/Activate.ps1""; pip install -r requirements.txt; python manage.py ensure_database; python manage.py migrate; python manage.py ensure_superuser; python manage.py runserver"

Write-Host "[4/4] Starte Frontend und Mobile..."
$mobileApiBaseUrl = Resolve-MobileApiBaseUrl "$Root/mobile/.env"
$mobileLocalIp = Resolve-LocalIp
Write-Host "[INFO] EXPO_PUBLIC_API_BASE_URL=$mobileApiBaseUrl"
if ($mobileLocalIp) {
  Write-Host "[INFO] REACT_NATIVE_PACKAGER_HOSTNAME=$mobileLocalIp"
} else {
  Write-Host "[WARN] Konnte keine LAN-IP ermitteln. Expo Go erreicht den PC ggf. nicht."
}
if ($mobileApiBaseUrl -match '^https?://(localhost|127\.0\.0\.1)(:|/|$)') {
  Write-Host "[HINWEIS] localhost zeigt in Expo Go auf dem Handy auf das Handy selbst."
  Write-Host "         Setze in mobile/.env EXPO_PUBLIC_API_BASE_URL=auto (empfohlen) oder eine explizite LAN-Adresse."
}
# Windows-Defender-Firewall blockt Node oft beim ersten Start - Hinweis ausgeben.
Write-Host "[HINWEIS] Falls Expo Go beim Scan timeoutet: Windows-Firewall fragt beim 1. Start nach 'node' -> 'Privates Netzwerk' erlauben."

# .env.local schreiben, damit Expo Metro die aktuelle URL garantiert in den Bundle inlined.
$envLocalPath = "$Root/mobile/.env.local"
@(
  "# Auto-generiert von start_win.ps1 bei jedem Start - nicht von Hand editieren.",
  "EXPO_PUBLIC_API_BASE_URL=$mobileApiBaseUrl"
) | Set-Content -Path $envLocalPath -Encoding UTF8
Write-Host "[INFO] mobile/.env.local aktualisiert."

# Bundle-Cache invalidieren - sonst haelt Metro alte EXPO_PUBLIC_*-Werte fest.
Write-Host "[INFO] Bundle-Cache aufraeumen (.expo, node_modules/.cache) ..."
Remove-Item -Recurse -Force "$Root/mobile/.expo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$Root/mobile/node_modules/.cache" -ErrorAction SilentlyContinue

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root/frontend'; npm install --include=dev; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root/mobile'; `$env:EXPO_PUBLIC_API_BASE_URL='$mobileApiBaseUrl'; `$env:REACT_NATIVE_PACKAGER_HOSTNAME='$mobileLocalIp'; npm install --include=dev; npx expo start --host lan --clear"
