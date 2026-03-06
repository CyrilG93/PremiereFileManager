# Premiere Pro File Manager

A powerful Adobe Premiere Pro extension for managing project files, importing media, and consolidating your project structure.

## Features

- 📥 **Smart Import**: Automatically detect and import new files from your project folder
- 🎥 **Camera Folder Support**: Detect major camera card structures and import only media clips (without recreating full technical folder trees)
- 📦 **Consolidate**: Organize external files into your project structure (copy files that are outside your project folder)
- 🔄 **Auto-Import Toggle**: Quick toggle button in header with visual feedback
- 🔗 **Auto-Relink**: Automatically relink media when files are moved
- 🚫 **File Filtering**: Exclude specific file types and folders
- 🌍 **Multi-language**: Support for Deutsch, English, Español, Français, Italiano, Português (Brasil), Русский, 日本語 and 简体中文 with instant language switch
- 🎨 **Responsive UI**: Adapts to different panel sizes with compact mode
- 🔍 **Debug Mode**: Built-in diagnostics for troubleshooting

## Installation

### macOS

1. Download the latest release from the [Releases](Releases/) folder
2. Extract the ZIP file
3. Open Terminal
4. **Easiest method (recommended):** drag and drop `install_macos.sh` into the Terminal window, then press Enter
5. **Manual method (command line):** navigate to the extracted folder and run:
   ```bash
   cd /path/to/PremiereFileManager
   chmod +x install_macos.sh
   ./install_macos.sh
   ```
6. Restart Adobe Premiere Pro
7. Open the extension: **Window → Extensions → File Manager**

### Windows

1. Download the latest release from the [Releases](Releases/) folder
2. Extract the ZIP file
3. Run `install_windows.bat` as Administrator
4. Restart Adobe Premiere Pro
5. Open the extension: **Window → Extensions → File Manager**

## Usage

### Import Files

1. Set your project root folder in Settings (or use auto-detection)
2. Click **Analyze** to scan for new files
3. Review the list of files to import
4. Select the files you want to import
5. Click **Import**

### Consolidate Files

The extension will detect files that are used in your project but located outside your project folder. Click **Consolidate** to copy them into your project structure while maintaining the bin organization.

### Auto-Import

- Use the **Auto toggle button** in the header for quick on/off control
- Or enable in Settings for more options
- The button turns green when auto-import is active

## Settings

- **Language**: Quick language selector in header + full selector in settings
- **Host Log Level**: Control ExtendScript host verbosity (`debug`, `info`, `warn`, `error`)
- **Root Folder**: Set the base folder for your project (auto-detected by default)
- **Root Folder Levels**: Number of parent folders to go up from the .prproj file
- **Auto-Relink**: Automatically relink media after consolidation
- **Excluded Folders**: Folders to ignore during consolidation
- **Excluded Folder Names**: Folder names to exclude (e.g., "Backup", "Archive")
- **Banned Extensions**: File types to never import
- **Auto-Import**: Enable automatic scanning
- **Auto-Import Interval**: How often to scan (in seconds)

## Version History

### v1.2.1 (Unreleased)
- 🎥 Added camera folder structure handling for import:
  - ARRIRAW
  - RED
  - AVCHD
  - Canon XF
  - Panasonic P2
  - XDCAM-EX
  - XDCAM-HD
  - Sony HDV
  - Sony a7S
  - DCIM
- ✅ Camera imports now keep only the useful media clip and avoid recreating full technical card subfolders in bins
- 🌍 Added UI language support for: Deutsch, English, Español, Français, Italiano, Português (Brasil), Русский, 日本語, 简体中文
- 🛡️ Improved banned-extensions defaults and update migration:
  - Added common non-importable files (shortcuts, camera sidecars, incompatible image formats)
  - On update, missing default banned extensions are auto-added without removing user custom extensions
- ⚡ Added incremental scan cache to reduce repeated stability checks on unchanged files
- 🔁 Added advanced deduplication for import candidates (source path + clip signature name/size/mtime)
- 🚫 Auto-import now suggests auto-banning extension only when host classifies the import failure as incompatible format (not corruption/IO errors)
- 📦 Reinforced transfer-in-progress protection with stricter file stability checks and extra pass for very recent files
- 🧠 Replaced filename-only fallback with robust signature fallback (name + size + mtime)
- ⚙️ Optimized scan filters with O(1) lookup maps for banned extensions and excluded folder names
- 📚 Added persistent failed-import blacklist file with TTL cleanup across sessions
- 📦 Added import batching for large auto/manual imports to avoid oversized payloads
- 📝 Added configurable host log level and connected it to persisted settings
- 🪵 Capped debug UI log history to keep memory usage bounded during long sessions
- 💾 Debounced frequent settings writes and flushes on explicit save
- 💽 Scan cache is now written only when data actually changed

### v1.1.0 (Latest)
- 🚀 **NAS Optimization**: Massive performance boost (up to 20x faster) and reliability fix for network transfers (EBADF)
- 📊 **Progress UI**: Added detailed consolidation progress bar with real-time speed and ETA
- 🛡️ **Stability**: Enhanced verification logic for zero-error file transfers
- 🧹 **UX Improvements**: Minimalist compact mode ("3 buttons"), auto-hidden debug logs
- 🌍 **Network**: Added directory creation verification for network shares

### v1.0.8
- ⚙️ **Config**: Moved configuration files to local storage for better management across updates
- Sorted banned extensions alphabetically
- Fixed JSON parsing error on batch export

### v1.0.5
- ✅ Added quick language selector with flag emojis in header
- ✅ Instant language change without saving settings
- ✅ Renamed "Export" to "Consolidate" for better clarity (matches Adobe terminology)
- ✅ Added auto-import toggle button in header with visual feedback
- ✅ Compact mode: auto button shows icon only
- ✅ Fixed all translation inconsistencies

### v1.0.4
- Fixed duplicate import detection for moved projects
- Added filename fallback comparison for cross-computer compatibility
- Fixed double slash path normalization
- Made debug section collapsible and closed by default
- Improved path comparison for files outside project root

### v1.0.3
- Added filename fallback for import duplicate detection
- Improved handling of files moved between computers

### v1.0.2
- Added debug UI for troubleshooting path issues
- Improved logging and diagnostics

## Compatibility

- **Premiere Pro**: CC 2018 and later
- **Operating Systems**: macOS 10.12+ and Windows 10+

## Troubleshooting

### Extension doesn't appear

1. Make sure you've restarted Premiere Pro after installation
2. Check that the extension is installed in the correct location:
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/PremiereFileManager`
   - Windows: `C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\PremiereFileManager`

### Files are re-imported after moving project

If you're still experiencing this issue:
1. Click **Analyze**
2. Open the **Debug Info** section (click to expand)
3. Check the relative paths being compared
4. Report the issue with the debug information

### Auto-import not working

1. Check that Auto-Import is enabled (button should be green)
2. Verify the Auto-Import Interval is set correctly in Settings
3. Make sure files are not in excluded folders or have banned extensions

## Development

### Project Structure

```
PremiereFileManager/
├── Source/
│   ├── client/          # UI and client-side logic
│   │   ├── index.html
│   │   ├── css/
│   │   ├── js/
│   │   └── lang/        # Translations (en.json, fr.json)
│   ├── host/            # ExtendScript (Premiere Pro API)
│   │   └── index.jsx
│   ├── CSXS/            # Extension manifest
│   │   └── manifest.xml
│   └── install scripts
└── Releases/            # Packaged releases
```

## License

This project is provided as-is for use with Adobe Premiere Pro.

## Support

For issues, questions, or feature requests, please send me a message on Discord.

## Credits

Developed by CyrilG93.
