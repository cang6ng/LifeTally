param(
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\public\assets\default-wallpaper.png')
)

Add-Type -AssemblyName System.Drawing

$wallpaperWidth = 2560
$wallpaperHeight = 1440
$bitmap = New-Object System.Drawing.Bitmap(
  $wallpaperWidth,
  $wallpaperHeight,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

function New-Color([string]$hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Add-Hill {
  param(
    [System.Drawing.PointF[]]$Points,
    [string]$TopColor,
    [string]$BottomColor
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddCurve($Points, 0.42)
  $path.AddLine($Points[-1].X, $Points[-1].Y, $wallpaperWidth, $wallpaperHeight)
  $path.AddLine($wallpaperWidth, $wallpaperHeight, 0, $wallpaperHeight)
  $path.AddLine(0, $wallpaperHeight, $Points[0].X, $Points[0].Y)
  $path.CloseFigure()

  $bounds = $path.GetBounds()
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $bounds,
    (New-Color $TopColor),
    (New-Color $BottomColor),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
  )
  $graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

try {
  $canvas = New-Object System.Drawing.Rectangle(0, 0, $wallpaperWidth, $wallpaperHeight)
  $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $canvas,
    (New-Color '#082A3A'),
    (New-Color '#B7DED1'),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Positions = [single[]](0.0, 0.42, 0.72, 1.0)
  $blend.Colors = [System.Drawing.Color[]]@(
    (New-Color '#082A3A'),
    (New-Color '#2D7180'),
    (New-Color '#A6D7CA'),
    (New-Color '#D7E6C3')
  )
  $sky.InterpolationColors = $blend
  $graphics.FillRectangle($sky, $canvas)
  $sky.Dispose()

  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse(930, -430, 1580, 1320)
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
  $glow.CenterColor = [System.Drawing.Color]::FromArgb(82, 255, 239, 190)
  $glow.SurroundColors = [System.Drawing.Color[]]@(
    [System.Drawing.Color]::FromArgb(0, 255, 239, 190)
  )
  $graphics.FillPath($glow, $glowPath)
  $glow.Dispose()
  $glowPath.Dispose()

  Add-Hill -Points ([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(0, 790),
    [System.Drawing.PointF]::new(330, 670),
    [System.Drawing.PointF]::new(720, 760),
    [System.Drawing.PointF]::new(1110, 615),
    [System.Drawing.PointF]::new(1510, 735),
    [System.Drawing.PointF]::new(1960, 600),
    [System.Drawing.PointF]::new(2560, 760)
  )) -TopColor '#416F69' -BottomColor '#244B48'

  Add-Hill -Points ([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(0, 925),
    [System.Drawing.PointF]::new(420, 790),
    [System.Drawing.PointF]::new(820, 900),
    [System.Drawing.PointF]::new(1260, 745),
    [System.Drawing.PointF]::new(1690, 875),
    [System.Drawing.PointF]::new(2180, 720),
    [System.Drawing.PointF]::new(2560, 845)
  )) -TopColor '#315C4D' -BottomColor '#173A35'

  Add-Hill -Points ([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(0, 1120),
    [System.Drawing.PointF]::new(360, 930),
    [System.Drawing.PointF]::new(780, 1050),
    [System.Drawing.PointF]::new(1180, 885),
    [System.Drawing.PointF]::new(1590, 1040),
    [System.Drawing.PointF]::new(2100, 890),
    [System.Drawing.PointF]::new(2560, 1040)
  )) -TopColor '#244738' -BottomColor '#0B2725'

  $mist = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 610, $wallpaperWidth, 410)),
    [System.Drawing.Color]::FromArgb(0, 218, 238, 220),
    [System.Drawing.Color]::FromArgb(54, 218, 238, 220),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
  )
  $graphics.FillRectangle($mist, 0, 610, $wallpaperWidth, 410)
  $mist.Dispose()

  $vignettePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $vignettePath.AddEllipse(-260, -180, $wallpaperWidth + 520, $wallpaperHeight + 420)
  $vignette = New-Object System.Drawing.Drawing2D.PathGradientBrush($vignettePath)
  $vignette.CenterColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
  $vignette.SurroundColors = [System.Drawing.Color[]]@(
    [System.Drawing.Color]::FromArgb(92, 3, 18, 22)
  )
  $graphics.FillRectangle($vignette, $canvas)
  $vignette.Dispose()
  $vignettePath.Dispose()

  $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
  $outputDirectory = Split-Path -Parent $resolvedOutput
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
  $bitmap.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $resolvedOutput
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}
