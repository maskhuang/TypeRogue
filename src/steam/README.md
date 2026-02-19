# Steam Depot Configuration

This directory contains Steam depot configuration files for uploading builds to Steam.

## Files

| File | Description |
|------|-------------|
| `app_build.vdf` | Main build configuration (app ID, depots) |
| `depot_build_win.vdf` | Windows depot configuration |
| `depot_build_mac.vdf` | macOS depot configuration |
| `scripts/upload.sh` | Automated upload script |

## Setup

### 1. Configure App and Depot IDs

Edit the following files and replace placeholder IDs:

**app_build.vdf:**
- Replace `YOUR_APP_ID` with your Steam App ID
- Replace `YOUR_DEPOT_ID_WIN` and `YOUR_DEPOT_ID_MAC` with your depot IDs

**depot_build_win.vdf / depot_build_mac.vdf:**
- Replace `YOUR_DEPOT_ID_*` with the corresponding depot IDs

### 2. Install SteamCMD

Download SteamCMD from https://developer.valvesoftware.com/wiki/SteamCMD

### 3. Set Environment Variables

```bash
export STEAMCMD_PATH=/path/to/steamcmd
export STEAM_USERNAME=your_steam_username
```

### 4. Build and Upload

```bash
# Build first
npm run release

# Verify build
npm run verify

# Upload to Steam (interactive login)
./steam/scripts/upload.sh
```

## Steamworks Partner Setup

1. Log in to https://partner.steamgames.com
2. Go to your app's settings
3. Create depots for Windows and macOS under "SteamPipe" → "Depots"
4. Note the App ID and Depot IDs
5. Configure "Launch Options" to point to the executable

## Security Notes

- Never commit credentials or Steam Guard tokens
- Use environment variables for sensitive data
- The `.vdf` files are safe to commit (they only contain IDs)
- Consider using Steam's two-factor authentication

## Troubleshooting

### Upload fails with "Access Denied"
- Ensure your Steam account has permission to upload builds
- Check that the App ID is correct

### Files not included in depot
- Verify `contentroot` points to the correct directory
- Check `FileExclusion` patterns

### Build too large
- Ensure debug symbols (*.pdb, *.dsym) are excluded
- Check for unnecessary files in the release directory
