// File operations using Node.js
// This module handles file copying and directory creation

const fs = require('fs');
const path = require('path');

// Normalize path for current platform
function normalizePathForPlatform(filePath) {
    if (!filePath) return '';

    // Convert to platform-specific separators
    return path.normalize(filePath);
}

// Check if file exists
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (e) {
        return false;
    }
}

// Create directory recursively
function createDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return true;
    } catch (e) {
        console.error('Error creating directory:', e);
        return false;
    }
}

// Copy file
function copyFile(source, destination) {
    return new Promise((resolve, reject) => {
        try {
            // Normalize paths
            const normalizedSource = normalizePathForPlatform(source);
            const normalizedDest = normalizePathForPlatform(destination);

            // Check if source exists
            if (!fileExists(normalizedSource)) {
                reject(new Error('Source file does not exist: ' + normalizedSource));
                return;
            }

            // Check if destination already exists
            if (fileExists(normalizedDest)) {
                resolve({ skipped: true, reason: 'File already exists' });
                return;
            }

            // Create destination directory
            const destDir = path.dirname(normalizedDest);
            if (!createDirectory(destDir)) {
                reject(new Error('Failed to create destination directory'));
                return;
            }

            // Copy file synchronously to ensure binary integrity
            try {
                fs.copyFileSync(normalizedSource, normalizedDest);
                resolve({ success: true });
            } catch (err) {
                reject(err);
            }

        } catch (e) {
            reject(e);
        }
    });
}

// Copy multiple files with progress callback
async function copyFiles(fileList, progressCallback) {
    const results = [];
    const total = fileList.length;

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        try {
            const result = await copyFile(file.source, file.destination);

            results.push({
                name: file.name,
                success: true,
                skipped: result.skipped || false,
                reason: result.reason || null
            });

        } catch (e) {
            results.push({
                name: file.name,
                success: false,
                error: e.message
            });
        }

        // Call progress callback
        if (progressCallback) {
            progressCallback({
                current: i + 1,
                total: total,
                percent: Math.round(((i + 1) / total) * 100)
            });
        }
    }

    return results;
}

// Get file size
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (e) {
        return 0;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Export functions for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizePathForPlatform,
        fileExists,
        createDirectory,
        copyFile,
        copyFiles,
        getFileSize,
        formatFileSize
    };
}
