Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$size,
        [string]$filename
    )
    
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Background gradient (simplified to solid color)
    $brush1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(102, 126, 234))
    $graphics.FillRectangle($brush1, 0, 0, $size, $size)
    
    # Text
    $brush2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $fontSize = [Math]::Max(8, $size * 0.4)
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $graphics.DrawString('ML', $font, $brush2, $rect, $format)
    
    $bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    $font.Dispose()
    $brush1.Dispose()
    $brush2.Dispose()
}

# Create icons
Create-Icon 16 'icon16.png'
Create-Icon 32 'icon32.png'
Create-Icon 48 'icon48.png'
Create-Icon 128 'icon128.png'

Write-Host "Icons created successfully"