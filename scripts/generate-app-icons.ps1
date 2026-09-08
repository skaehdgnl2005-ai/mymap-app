# Generates Phase 10 app icons from Pretendard-Bold.otf + brand tokens.
#
# Phase 10 task 13 spec (PROJECT_STATE.md → phases/CURRENT_PHASE.md):
#   - 1024x1024 PNG, no transparency
#   - brand_indigo background (#2D2A6B) + white mark
#   - Android adaptive icon: foreground (transparent bg) + solid bg color
#
# Mark choice: single Hangul `자` (Pretendard Bold, white). Single-char
# Korean app icon convention (토스 T / 무신사 M); 자국 = trace/mark via
# 발자국/흔적 compound semantic — `자` standalone preserves the trace read
# at home-screen scale where `자국` 2-char would degrade to mush.
#
# Outputs (in assets/):
#   icon.png            — 1024x1024, solid indigo + white 자  (iOS + fallback)
#   adaptive-icon.png   — 1024x1024, transparent + white 자   (Android FG)
#   splash-icon.png     — 1024x1024, solid indigo + white 자  (cold-boot)
#   favicon.png         —   48x48,   solid indigo + white 자  (web — v1.5)
#
# Dependencies: PowerShell 5+ on Windows. .NET System.Drawing. No npm dep.
# Re-run after font swap or brand pivot. Idempotent.

Add-Type -AssemblyName System.Drawing

$ROOT = Split-Path -Parent $PSScriptRoot
$FONT_PATH = Join-Path $ROOT 'build\icon-fonts\Pretendard-Bold.otf'
$OUT_DIR   = Join-Path $ROOT 'assets'

if (-not (Test-Path $FONT_PATH)) {
    Write-Error "Pretendard-Bold.otf not found at $FONT_PATH. Download with:"
    Write-Error "  curl -sL -o build/icon-fonts/Pretendard-Bold.otf https://github.com/orioncactus/pretendard/raw/v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf"
    exit 1
}

# Brand tokens — keep in sync with spec/tokens.json
$BRAND_INDIGO = [System.Drawing.Color]::FromArgb(255, 0x2D, 0x2A, 0x6B)
$WHITE        = [System.Drawing.Color]::White
$MARK         = [string][char]0xC790  # '자' U+C790

# Load Pretendard-Bold via PrivateFontCollection (no system install).
$pfc = New-Object System.Drawing.Text.PrivateFontCollection
$pfc.AddFontFile($FONT_PATH)
$family = $pfc.Families[0]
Write-Host "Loaded font family: $($family.Name)"

function New-IconBitmap {
    param(
        [int]$Size,
        [bool]$SolidBackground,    # true = indigo fill; false = transparent
        [double]$MarkRatio = 0.50  # actual glyph bbox occupies this fraction of canvas
    )

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode    = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode  = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($SolidBackground) {
        $bgBrush = New-Object System.Drawing.SolidBrush $BRAND_INDIGO
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
        $bgBrush.Dispose()
    }
    # else: leave alpha=0 transparent (Android adaptive foreground)

    # Two-pass true-bounds centering via GraphicsPath:
    #   Pass 1: build path at a large nominal em, measure actual glyph bbox.
    #   Pass 2: scale + translate so the bbox is centered and sized to MarkRatio.
    # This bypasses GDI+ DrawString line-leading + side-bearing centering quirks.
    $nominalEm = 1000.0  # arbitrary large unit for accurate bbox
    $probe = New-Object System.Drawing.Drawing2D.GraphicsPath
    $fmt = New-Object System.Drawing.StringFormat
    $probe.AddString($MARK, $family, [int][System.Drawing.FontStyle]::Bold, [single]$nominalEm, (New-Object System.Drawing.PointF 0, 0), $fmt)
    $glyphBounds = $probe.GetBounds()
    $probe.Dispose()

    # Scale factor: target glyph height = $Size * $MarkRatio (using the larger axis to fit)
    $glyphMaxAxis = [Math]::Max($glyphBounds.Width, $glyphBounds.Height)
    $scale = ($Size * $MarkRatio) / $glyphMaxAxis

    $targetEm = [single]($nominalEm * $scale)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddString($MARK, $family, [int][System.Drawing.FontStyle]::Bold, $targetEm, (New-Object System.Drawing.PointF 0, 0), $fmt)
    $bounds = $path.GetBounds()

    # Translate so bbox center lands at canvas center
    $tx = ($Size / 2.0) - ($bounds.X + $bounds.Width / 2.0)
    $ty = ($Size / 2.0) - ($bounds.Y + $bounds.Height / 2.0)
    $matrix = New-Object System.Drawing.Drawing2D.Matrix
    $matrix.Translate([single]$tx, [single]$ty)
    $path.Transform($matrix)

    $textBrush = New-Object System.Drawing.SolidBrush $WHITE
    $g.FillPath($textBrush, $path)

    $textBrush.Dispose()
    $matrix.Dispose()
    $path.Dispose()
    $fmt.Dispose()
    $g.Dispose()
    return $bmp
}

function Save-Png {
    param([System.Drawing.Bitmap]$Bitmap, [string]$Path)
    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $Bitmap.Dispose()
    Write-Host "  wrote $Path"
}

# 1. icon.png — iOS + general 1024x1024 solid indigo.
#    Toss-style restraint: mark fills 50% of canvas, leaving breathing room
#    under the iOS rounded-corner mask.
$bmp = New-IconBitmap -Size 1024 -SolidBackground $true -MarkRatio 0.50
Save-Png $bmp (Join-Path $OUT_DIR 'icon.png')

# 2. adaptive-icon.png — Android FG, transparent bg.
#    Android adaptive icon safe zone = 66dp / 108dp = 61% of canvas. Sizing
#    foreground to 42% leaves comfortable padding under launcher mask shape
#    variations (circle, squircle, teardrop).
$bmp = New-IconBitmap -Size 1024 -SolidBackground $false -MarkRatio 0.42
Save-Png $bmp (Join-Path $OUT_DIR 'adaptive-icon.png')

# 3. splash-icon.png — cold-boot. Transparent bg + white mark; the indigo
#    backdrop comes from app.config.ts splash.backgroundColor so brand
#    color is changeable from one place. Mark smaller than app icon
#    (30% vs 50%) — splash is a calmer "we're loading" moment.
$bmp = New-IconBitmap -Size 1024 -SolidBackground $false -MarkRatio 0.30
Save-Png $bmp (Join-Path $OUT_DIR 'splash-icon.png')

# 4. favicon.png — web (deferred to v1.5; generate anyway for completeness).
#    Small canvas needs aggressive sizing.
$bmp = New-IconBitmap -Size 48 -SolidBackground $true -MarkRatio 0.65
Save-Png $bmp (Join-Path $OUT_DIR 'favicon.png')

# PrivateFontCollection cleanup
$pfc.Dispose()

Write-Host "`nDone. 4 icons regenerated in $OUT_DIR."
Write-Host "Coupled config in app.config.ts (re-check on brand pivot):"
Write-Host "  splash.backgroundColor          = '#2D2A6B' (brand_indigo)"
Write-Host "  android.adaptiveIcon.backgroundColor = '#2D2A6B' (brand_indigo)"
Write-Host "  splash-icon.png + adaptive-icon.png are transparent-bg foregrounds."
Write-Host "  icon.png is the only solid-bg asset (iOS has no separate bg field)."
