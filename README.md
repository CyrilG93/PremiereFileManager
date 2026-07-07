# Premiere Pro File Manager

A powerful Adobe Premiere Pro extension for managing project files, importing media, and consolidating your project structure.

## Features

- 📥 **Smart Import**: Automatically detect and import new files from your project folder
- 🎥 **Camera Folder Support**: Detect major camera card structures and import only media clips (without recreating full technical folder trees)
- 📦 **Consolidate**: Organize external files into your project structure (copy files that are outside your project folder)
- 🔄 **Auto-Import Toggle**: Quick toggle button in header with visual feedback
- ⌨️ **SpellBook Support**: Trigger compact actions from SpellBook shortcuts or control surfaces
- 🔗 **Auto-Relink**: Automatically relink media when files are moved
- 🚫 **File Filtering**: Exclude specific file types and folders
- 🌍 **Multi-language**: Support for Deutsch, English, Español, Français, Italiano, Português (Brasil), Русский, 日本語 and 简体中文 with instant language switch
- 🎨 **Responsive UI**: Adapts to different panel sizes with compact mode
- 🎛️ **Premiere Theme Support**: Follows Premiere Pro's light and dark interface colors
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
- Toggle state is persisted immediately, so Premiere relaunch keeps the same ON/OFF state

### SpellBook

Install the official SpellBook app and SpellBook extension from Knights of the Editing Table. File Manager registers three compact-mode commands in the **File Manager Compact** group:

- **Toggle Auto Sync**
- **Import**
- **Consolidate**

The **Import** and **Consolidate** commands use the same one-click behavior as compact mode: analyze first, then process all detected files.

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
- **Version Badge**: In full mode, click the version badge next to the title to open the File Manager product page

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

## Changelog

### v1.4.0 (Latest) - 2026-07-06
- Added SpellBook compact commands for external shortcuts and control surfaces.
- Added a clickable version badge in the full-mode header that opens the File Manager product page.
- Improved camera-card imports, Windows NAS path handling, and installer debug-mode coverage.

### v1.3.2 - 2026-06-29
- Renamed the SpellBook extension section to **File Manager**.

### v1.3.1 - 2026-06-29
- Added SpellBook support for compact-mode shortcuts and control surfaces.
- Registered three commands: Toggle Auto Sync, Import, and Consolidate.

### v1.3.0
- Added camera folder structure handling for import: ARRIRAW, RED, AVCHD, Canon XF, Panasonic P2, XDCAM-EX, XDCAM-HD, Sony HDV, Sony a7S, and DCIM.
- Camera imports now keep only the useful media clip and avoid recreating full technical card subfolders in bins.
- Added UI language support for Deutsch, English, Español, Français, Italiano, Português (Brasil), Русский, 日本語, and 简体中文.
- Improved import filtering, scan performance, import batching, debug logging, and auto-import persistence.
- Fixed Windows NAS path normalization for consolidation.

### v1.1.0
- Added NAS performance improvements, detailed consolidation progress, and compact-mode UX updates.

### v1.0.8
- Moved configuration files to local storage and improved settings reliability.

### v1.0.5
- Added quick language selection, instant language switching, clearer Consolidate naming, and the header auto-import toggle.

### v1.0.4
- Improved duplicate detection, moved-project handling, debug visibility, and external file path comparison.

### v1.0.3
- Improved import duplicate detection for moved projects.

### v1.0.2
- Added debug UI and improved troubleshooting diagnostics.
