Add-Type -AssemblyName System.Speech
$razRewardVoice=New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $razRewardVoice.SelectVoice('Microsoft Zira Desktop'); $razRewardVoice.Rate=1; $razRewardVoice.SetOutputToWaveFile('D:\raz_english\public\audio\wow.wav'); $razRewardVoice.Speak('Wow!'); } finally { $razRewardVoice.Dispose() }
