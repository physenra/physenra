Add-Type -AssemblyName System.Drawing

function Optimize-Image($src, $dest, [long]$quality = 75) {
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
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)

    $bmp.Save($dest, $codec, $encoderParams)
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()

    $fi = Get-Item $dest
    Write-Output "Optimized $dest : $($fi.Length) bytes"
}

Optimize-Image 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\physenra_codman_pendulum_exercise_clean_1792344265789.jpg' 'C:\project\physenra\public\images\exercises\photographs\pendulum-codman.jpg' 75
Optimize-Image 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\side_plank_ql_stabilization_1792344247108.jpg' 'C:\project\physenra\public\images\exercises\photographs\side-plank.jpg' 75
