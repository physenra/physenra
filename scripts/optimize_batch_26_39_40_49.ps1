# Optimization script for Exercise Photos Batch: 26, 39, 40, 49
Add-Type -AssemblyName System.Drawing

$sourceDir = "C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa"
$targetDir = "C:\project\physenra\public\images\exercises\photographs"

$items = @(
    @{
        Source = "clamshell_band_exercise_1792941012806.jpg"
        Target = "clamshells.jpg"
        Quality = 80
        TargetWidth = 960
    },
    @{
        Source = "lsvt_big_stepping_drill_1792940945684.jpg"
        Target = "lsvt-big-stepping.jpg"
        Quality = 80
        TargetWidth = 960
    },
    @{
        Source = "auditory_cued_gait_training_1792940946218.jpg"
        Target = "auditory-cued-gait.jpg"
        Quality = 80
        TargetWidth = 960
    },
    @{
        Source = "lateral_bound_and_stick_left_leg_landing_1792941119802.jpg"
        Target = "lateral-bound-and-stick.jpg"
        Quality = 80
        TargetWidth = 960
    }
)

function Get-Encoder($format) {
    [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders() | Where-Object { $_.FormatDescription -eq $format }
}

$jpegCodec = Get-Encoder("JPEG")

foreach ($item in $items) {
    $srcPath = Join-Path $sourceDir $item.Source
    $dstPath = Join-Path $targetDir $item.Target
    
    if (-not (Test-Path $srcPath)) {
        Write-Error "Source file not found: $srcPath"
        continue
    }
    
    $origImage = [System.Drawing.Image]::FromFile($srcPath)
    
    # Calculate target dimensions maintaining aspect ratio
    $origW = $origImage.Width
    $origH = $origImage.Height
    $targetW = [Math]::Min($item.TargetWidth, $origW)
    $targetH = [int]([double]$origH * ([double]$targetW / [double]$origW))
    
    $newImage = New-Object System.Drawing.Bitmap $targetW, $targetH
    $graphics = [System.Drawing.Graphics]::FromImage($newImage)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graphics.DrawImage($origImage, 0, 0, $targetW, $targetH)
    
    # Set JPEG compression quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$item.Quality)
    
    $newImage.Save($dstPath, $jpegCodec, $encoderParams)
    
    $graphics.Dispose()
    $newImage.Dispose()
    $origImage.Dispose()
    
    $info = Get-Item $dstPath
    Write-Host "Optimized $($item.Target): $($info.Length) bytes ($targetW x $targetH)"
}
