Add-Type -AssemblyName System.Drawing

$src = 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\pursed_lip_breathing_drill_1792441282698.jpg'
$dest = 'C:\project\physenra\public\images\exercises\photographs\pursed-lip-breathing.jpg'
$quality = 75

$img = [System.Drawing.Image]::FromFile($src)

# Portrait image: max dimension 1280
$maxDim = 1280
if ($img.Height -gt $img.Width) {
    $targetHeight = $maxDim
    $targetWidth = [int]($img.Width * ($maxDim / $img.Height))
} else {
    $targetWidth = $maxDim
    $targetHeight = [int]($img.Height * ($maxDim / $img.Width))
}

$bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, 0, 0, $targetWidth, $targetHeight)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

$bmp.Save($dest, $codec, $encoderParams)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()

$fi = Get-Item $dest
Write-Output "Optimized $dest : $($fi.Length) bytes ($([math]::Round($fi.Length / 1KB, 1)) KB)"
