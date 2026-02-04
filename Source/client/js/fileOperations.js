// File operations using Node.js
// This module handles file copying and directory creation
// Optimized for large files and NAS targets with streaming and retry support

const fs = require('fs');
const path = require('path');

// Configuration for NAS-optimized file operations
const FM_COPY_CONFIG = {
    CHUNK_SIZE: 16 * 1024 * 1024,  // 16MB chunks for network stability
    MAX_RETRIES: 3,                 // Maximum retry attempts
    RETRY_DELAY_BASE: 1000,         // Base delay for exponential backoff (ms)
    HIGH_WATER_MARK: 16 * 1024 * 1024 // Stream buffer size
};

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

// Streaming file copy - optimized for large files and NAS targets
// Uses streams with chunking to prevent EBADF errors on network mounts
function fm_copyFileStreaming(source, destination, progressCallback) {
    return new Promise((resolve, reject) => {
        const normalizedSource = normalizePathForPlatform(source);
        const normalizedDest = normalizePathForPlatform(destination);

        let stats;
        try {
            stats = fs.statSync(normalizedSource);
        } catch (err) {
            reject(new Error('Cannot read source file: ' + err.message));
            return;
        }

        const totalSize = stats.size;
        let copiedBytes = 0;

        const readStream = fs.createReadStream(normalizedSource, {
            highWaterMark: FM_COPY_CONFIG.HIGH_WATER_MARK
        });

        const writeStream = fs.createWriteStream(normalizedDest, {
            highWaterMark: FM_COPY_CONFIG.HIGH_WATER_MARK
        });

        // Track progress on data chunks
        readStream.on('data', (chunk) => {
            copiedBytes += chunk.length;
            if (progressCallback) {
                progressCallback(copiedBytes, totalSize);
            }
        });

        // Handle read errors
        readStream.on('error', (err) => {
            writeStream.destroy();
            reject(new Error('Read error: ' + err.message));
        });

        // Handle write errors (common on NAS disconnects)
        writeStream.on('error', (err) => {
            readStream.destroy();
            reject(new Error('Write error: ' + err.message));
        });

        // Success when write completes
        writeStream.on('finish', () => {
            resolve({ success: true, size: totalSize });
        });

        // Pipe data from source to destination
        readStream.pipe(writeStream);
    });
}

// Copy file with automatic retry - handles transient NAS connection issues
async function fm_copyFileWithRetry(source, destination, maxRetries = FM_COPY_CONFIG.MAX_RETRIES, progressCallback) {
    const normalizedDest = normalizePathForPlatform(destination);
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fm_copyFileStreaming(source, destination, progressCallback);
            return result;
        } catch (err) {
            lastError = err;
            console.warn(`[PremiereFileManager] Copy attempt ${attempt}/${maxRetries} failed: ${err.message}`);

            // Clean up partial/corrupted file on destination
            try {
                if (fs.existsSync(normalizedDest)) {
                    fs.unlinkSync(normalizedDest);
                    console.log(`[PremiereFileManager] Cleaned up partial file: ${normalizedDest}`);
                }
            } catch (cleanupErr) {
                console.warn(`[PremiereFileManager] Could not clean up partial file: ${cleanupErr.message}`);
            }

            // Wait before retry with exponential backoff
            if (attempt < maxRetries) {
                const delay = FM_COPY_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
                console.log(`[PremiereFileManager] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries exhausted
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Copy file - main entry point
// Uses streaming for large files (>50MB) or when destination looks like a network path
function copyFile(source, destination) {
    return new Promise(async (resolve, reject) => {
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

            // Determine if we should use streaming (large files or network paths)
            let useStreaming = false;
            const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

            try {
                const stats = fs.statSync(normalizedSource);
                // Use streaming for large files
                if (stats.size > LARGE_FILE_THRESHOLD) {
                    useStreaming = true;
                }
            } catch (e) {
                // If we can't stat, fallback to streaming for safety
                useStreaming = true;
            }

            // Check if destination looks like a network path (NAS, SMB, etc.)
            const isNetworkPath = normalizedDest.startsWith('/Volumes/') ||
                normalizedDest.startsWith('//') ||
                normalizedDest.match(/^[A-Z]:\\\\[^\\]+\\\\/i) ||
                normalizedDest.includes('\\\\');

            if (isNetworkPath) {
                useStreaming = true;
            }

            if (useStreaming) {
                // Use streaming copy with retry for large files and network destinations
                try {
                    const result = await fm_copyFileWithRetry(normalizedSource, normalizedDest);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            } else {
                // Use sync copy for small local files (faster)
                try {
                    fs.copyFileSync(normalizedSource, normalizedDest);
                    resolve({ success: true });
                } catch (err) {
                    reject(err);
                }
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
