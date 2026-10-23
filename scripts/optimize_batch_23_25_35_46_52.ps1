Add-Type -AssemblyName System.Drawing

function Optimize-Image($src, $dest, $quality, $targetWidth) {
    $img = [System.Drawing.Image]::FromFile($src)
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
}

Optimize-Image `
    -src 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\wrist_flexor_eccentric_loading_1792362586028.jpg' `
    -dest 'C:\project\physenra\public\images\exercises\photographs\wrist-flexor-eccentric.jpg' `
    -quality 75 `
    -targetWidth 1280

Optimize-Image `
    -src 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\forearm_pronation_supination_drill_1792441181284.jpg' `
    -dest 'C:\project\physenra\public\images\exercises\photographs\forearm-pronation-supination.jpg' `
    -quality 75 `
    -targetWidth 1280

Optimize-Image `
    -src 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\towel_scrunches_intrinsic_foot_exercise_1792439278244.jpg' `
    -dest 'C:\project\physenra\public\images\exercises\photographs\towel-scrunches.jpg' `
    -quality 75 `
    -targetWidth 1280

Optimize-Image `
    -src 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\physenra_bear_crawl_hover_1792449417661.jpg' `
    -dest 'C:\project\physenra\public\images\exercises\photographs\bear-crawl.jpg' `
    -quality 75 `
    -targetWidth 1280

Optimize-Image `
    -src 'C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa\tandem_stance_heel_to_toe_exact_1792448045413.jpg' `
    -dest 'C:\project\physenra\public\images\exercises\photographs\tandem-stance.jpg' `
    -quality 65 `
    -targetWidth 1100
