Add-Type -AssemblyName System.Drawing

$src = 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\bilateral_table_slides_towel_rehab_v3_1792439634236.jpg'
$dest = 'C:\project\physenra\public\images\exercises\photographs\table-slides.jpg'
$quality = 75

$img = [System.Drawing.Image]::FromFile($src)
$targetWidth = 1280
$targetHeight = [int]($img.Height * ($targetWidth / $img.Width))

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
