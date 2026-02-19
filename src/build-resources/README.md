# Build Resources

This directory contains assets required for building the application installer.

## Required Files

| File | Format | Size | Description |
|------|--------|------|-------------|
| `icon.ico` | ICO | 256x256 (multi-size) | Windows application icon |
| `icon.icns` | ICNS | 1024x1024 | macOS application icon |
| `icon.png` | PNG | 512x512+ | Linux/source icon |

## Icon Generation

To generate all required icon formats from a source PNG:

### Using ImageMagick (macOS/Linux):

```bash
# From a 1024x1024 source.png
convert source.png -resize 256x256 icon.png

# Windows ICO (requires multiple sizes)
convert source.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# macOS ICNS
iconutil -c icns icon.iconset  # Requires icon.iconset folder
```

### Using electron-icon-builder:

```bash
npx electron-icon-builder --input=./source.png --output=./build-resources
```

## Notes

- Windows requires multi-size ICO with 16x16, 32x32, 48x48, 256x256
- macOS requires ICNS with sizes from 16x16 to 1024x1024
- Placeholder icons will cause build warnings but not failures
