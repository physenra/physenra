# Optimization script for Exercise Photos Batch: 20, 32, 34, 36
Add-Type -AssemblyName System.Drawing

$sourceDir = "C:\Users\Surface\.gemini\antigravity\brain\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa"
$targetDir = "C:\project\physenra\public\images\exercises\photographs"

$items = @(
    @{
        Source = "physenra_sleeper_stretch_clinical_final_1792784749849.jpg"
        Target = "sleeper-stretch.jpg"
        Quality = 80
        TargetWidth = 960
    },
    @{
        Source = "physenra_eccentric_step_down_drill_clinical_perfection_1792784933755.jpg"
        Target = "step-down-drill.jpg"
        Quality = 80
        TargetWidth = 720
    },
    @{
        Source = "resisted_ankle_eversion_physenra_v3_1792784863891.jpg"
        Target = "resisted-ankle-eversion.jpg"
        Quality = 80
        TargetWidth = 960
    },
    @{
        Source = "standing_weight_shift_mirror_feedback_v2_1792784791025.jpg"
        Target = "weight-shifting-standing.jpg"
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
