#!/bin/bash

# Installation script for Premiere Pro File Manager Extension (macOS)

echo "=========================================="
echo "File Manager Extension - Installation"
echo "=========================================="
echo ""

# Extension details
EXTENSION_NAME="PremiereFileManager"
EXTENSION_ID="com.filemanager.premiere"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# CEP extension directory for macOS
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"

# Create CEP directory if it doesn't exist
if [ ! -d "$CEP_DIR" ]; then
    echo "Creating CEP extensions directory..."
    mkdir -p "$CEP_DIR"
fi

# Target installation directory
INSTALL_DIR="$CEP_DIR/$EXTENSION_NAME"

# Remove existing installation if present
if [ -d "$INSTALL_DIR" ]; then
    echo "Removing existing installation..."
    rm -rf "$INSTALL_DIR"
fi

# Copy extension files
echo "Installing extension..."
cp -R "$SCRIPT_DIR" "$INSTALL_DIR"

# Remove installation script from installed directory
rm -f "$INSTALL_DIR/install_macos.sh"
rm -f "$INSTALL_DIR/install_windows.bat"

# Set permissions
chmod -R 755 "$INSTALL_DIR"

echo "🔧 Enabling PlayerDebugMode for unsigned extensions..."
# Enable debug mode for all CSXS versions
defaults write com.adobe.CSXS.9 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.10 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.11 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.12 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.13 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.14 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.15 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.16 PlayerDebugMode 1 2>/dev/null
echo "   ✓ Debug mode enabled for CSXS 9-16"

echo ""
echo "✓ Installation completed successfully!"
echo ""
echo "Extension installed to:"
echo "$INSTALL_DIR"
echo ""
echo "=========================================="
echo "Next steps:"
echo "=========================================="
echo "1. Restart Adobe Premiere Pro"
echo "2. Open the extension: Window > Extensions > File Manager"
echo ""
echo "Note: If the extension doesn't appear, you may need to enable"
echo "debug mode for CEP extensions. See README for instructions."
echo ""
