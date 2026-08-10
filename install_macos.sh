#!/bin/bash

# Install File Manager atomically in the current user's CEP extensions directory.
set -u

EXTENSION_NAME="PremiereFileManager"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
INSTALL_DIR="$CEP_DIR/$EXTENSION_NAME"
STAGING_DIR="$CEP_DIR/.${EXTENSION_NAME}.staging.$$"
BACKUP_DIR="$CEP_DIR/.${EXTENSION_NAME}.backup.$$"

fail() {
    echo "✗ Installation failed: $1"
    exit 1
}

cleanup() {
    # Remove only this installer's uniquely named temporary staging directory.
    [ -d "$STAGING_DIR" ] && rm -rf "$STAGING_DIR"
}

trap cleanup EXIT

echo "=========================================="
echo "File Manager Extension - Installation"
echo "=========================================="

[ -d "$SCRIPT_DIR/CSXS" ] || fail "the installer must be run from the extension Source folder."
mkdir -p "$CEP_DIR" || fail "cannot create the CEP extensions directory."

# Refuse unexpected paths before any recursive removal can occur.
[ "$INSTALL_DIR" = "$CEP_DIR/$EXTENSION_NAME" ] || fail "unexpected installation path."
rm -rf "$STAGING_DIR" "$BACKUP_DIR"
cp -R "$SCRIPT_DIR" "$STAGING_DIR" || fail "cannot copy extension files to staging."
rm -f "$STAGING_DIR/install_macos.sh" "$STAGING_DIR/install_windows.bat"
chmod -R u+rwX,go+rX "$STAGING_DIR" || fail "cannot set extension permissions."

if [ -d "$INSTALL_DIR" ]; then
    mv "$INSTALL_DIR" "$BACKUP_DIR" || fail "cannot preserve the current installation."
fi

if ! mv "$STAGING_DIR" "$INSTALL_DIR"; then
    [ -d "$BACKUP_DIR" ] && mv "$BACKUP_DIR" "$INSTALL_DIR"
    fail "cannot activate the new installation."
fi

[ -d "$BACKUP_DIR" ] && rm -rf "$BACKUP_DIR"

echo "Enabling PlayerDebugMode for unsigned extensions..."
DEBUG_ENABLED=0
for csxs_version in 9 10 11 12 13 14 15 16 17 18 19 20; do
    if defaults write "com.adobe.CSXS.$csxs_version" PlayerDebugMode 1 2>/dev/null; then
        DEBUG_ENABLED=$((DEBUG_ENABLED + 1))
    fi
done

if [ "$DEBUG_ENABLED" -eq 0 ]; then
    echo "⚠ PlayerDebugMode could not be enabled automatically."
fi

echo "✓ Installation completed: $INSTALL_DIR"
echo "Restart Adobe Premiere Pro, then open Window > Extensions > File Manager."
