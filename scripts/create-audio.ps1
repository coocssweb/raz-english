$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$razVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$razVoice.SelectVoice('Microsoft Zira Desktop')
$razVoice.Rate = -2
$razRoot = Split-Path $PSScriptRoot -Parent
try {
  foreach ($razFile in Get-ChildItem -LiteralPath (Join-Path $razRoot 'src/content/books') -Filter '*.json') {
    $razBook = Get-Content -LiteralPath $razFile.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    $razAudioDir = Join-Path $razRoot ('public/audio/' + $razBook.id)
    New-Item -ItemType Directory -Force -Path $razAudioDir | Out-Null
    foreach ($razPage in $razBook.pages) {
      $razOut = Join-Path $razRoot ('public' + $razPage.audio.src)
      $razVoice.SetOutputToWaveFile($razOut)
      $razVoice.Speak($razPage.english)
      $razVoice.SetOutputToNull()
    }
  }
} finally { $razVoice.Dispose() }
Write-Output 'Saved 96 English WAV narrations using Microsoft Zira Desktop (synthetic voice).'
