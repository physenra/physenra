Add-Type -AssemblyName System.Drawing

$src = 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\copenhagen_adductor_exercise_physenra_1792449413804.jpg'
$dest = 'C:\project\physenra\public\images\exercises\photographs\copenhagen-adductor.jpg'
$quality = 75

$bmpSrc = New-Object System.Drawing.Bitmap($src)

# Interpolate the tiny 16-pixel width vertical strip on the black metal strut
for ($y = 555; $y -le 672; $y++) {
    $cLeft = $bmpSrc.GetPixel(177, $y)
    $cRight = $bmpSrc.GetPixel(198, $y)
    for ($x = 178; $x -le 197; $x++) {
        $t = ($x - 178) / (197 - 178)
        $r = [int]($cLeft.R * (1 - $t) + $cRight.R * $t)
        $g = [int]($cLeft.G * (1 - $t) + $cRight.G * $t)
        $b = [int]($cLeft.B * (1 - $t) + $cRight.B * $t)
        $bmpSrc.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($r, $g, $b))
    }
}

# Resize to standard width 1280
$targetWidth = 1280
$targetHeight = [int]($bmpSrc.Height * ($targetWidth / $bmpSrc.Width))

$bmpResized = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$g = [System.Drawing.Graphics]::FromImage($bmpResized)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($bmpSrc, 0, 0, $targetWidth, $targetHeight)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

$bmpResized.Save($dest, $codec, $encoderParams)

$g.Dispose()
$bmpResized.Dispose()
$bmpSrc.Dispose()

$fi = Get-Item $dest
Write-Output "Optimized $dest : $($fi.Length) bytes ($([math]::Round($fi.Length / 1KB, 1)) KB)"
