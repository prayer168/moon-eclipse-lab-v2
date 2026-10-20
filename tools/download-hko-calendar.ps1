$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$calendarCache = Join-Path $projectRoot '.cache/hko'
New-Item -ItemType Directory -Path $calendarCache -Force | Out-Null
$indexUrl = 'https://www.hko.gov.hk/tc/gts/time/conversion1_text.htm'
$index = Invoke-WebRequest $indexUrl
$links = @($index.Links | Where-Object href -Match 'T\d{4}c\.txt$' | ForEach-Object { [uri]::new([uri]$indexUrl,$_.href).AbsoluteUri } | Sort-Object -Unique)
if ($links.Count -ne 200) { throw 'Official index did not contain the expected 200 years.' }
$links | ForEach-Object -Parallel {
 $file = Join-Path $using:calendarCache ([uri]$_).Segments[-1]
 if (!(Test-Path -LiteralPath $file)) { Invoke-WebRequest $_ -OutFile $file }
} -ThrottleLimit 4
Write-Output 'Run python tools/build-hko-calendar.py from the project folder.'
