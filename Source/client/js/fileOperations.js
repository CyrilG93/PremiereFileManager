// File operations using Node.js
// This module handles file copying and directory creation
// Optimized for large files and NAS targets with streaming and retry support

const fs = require('fs');
const path = require('path');

// Configuration for NAS-optimized file operations
const FM_COPY_CONFIG = {
    CHUNK_SIZE: 1 * 1024 * 1024,    // 1MB chunks (reduced for NAS stability)
    MAX_RETRIES: 3,                  // Maximum retry attempts
    RETRY_DELAY_BASE: 1000,          // Base delay for exponential backoff (ms)
    HIGH_WATER_MARK: 1 * 1024 * 1024, // 1MB stream buffer (reduced for NAS)
    DEBUG: true                       // Enable detailed logging
};

// Debug logging helper
function fm_debugLog(message, data = null) {
    if (!FM_COPY_CONFIG.DEBUG) return;
    const timestamp = new Date().toISOString().substr(11, 12);
    if (data !== null) {
        console.log(`[FM ${timestamp}] ${message}`, data);
    } else {
        console.log(`[FM ${timestamp}] ${message}`);
    }
}

// Format bytes to human readable
function fm_formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

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
            fm_debugLog(`Creating directory: ${dirPath}`);
            const startTime = Date.now();
            fs.mkdirSync(dirPath, { recursive: true });
            fm_debugLog(`Directory created in ${Date.now() - startTime}ms`);
        }
        return true;
    } catch (e) {
        console.error('[FM] Error creating directory:', e);
        return false;
    }
}

// Streaming file copy - optimized for large files and NAS targets
// Uses streams with chunking to prevent EBADF errors on network mounts
function fm_copyFileStreaming(source, destination, progressCallback) {
    return new Promise((resolve, reject) => {
        const normalizedSource = normalizePathForPlatform(source);
        const normalizedDest = normalizePathForPlatform(destination);
        const fileName = path.basename(normalizedSource);

        fm_debugLog(`[STREAM] Starting copy: ${fileName}`);
        fm_debugLog(`[STREAM] Source: ${normalizedSource}`);
        fm_debugLog(`[STREAM] Dest: ${normalizedDest}`);

        let stats;
        try {
            stats = fs.statSync(normalizedSource);
            fm_debugLog(`[STREAM] File size: ${fm_formatBytes(stats.size)}`);
        } catch (err) {
            fm_debugLog(`[STREAM] ERROR: Cannot stat source file: ${err.message}`);
            reject(new Error('Cannot read source file: ' + err.message));
            return;
        }

        const totalSize = stats.size;
        let copiedBytes = 0;
        let lastProgressLog = 0;
        const startTime = Date.now();

        fm_debugLog(`[STREAM] Creating read stream with highWaterMark: ${fm_formatBytes(FM_COPY_CONFIG.HIGH_WATER_MARK)}`);
        const readStream = fs.createReadStream(normalizedSource, {
            highWaterMark: FM_COPY_CONFIG.HIGH_WATER_MARK
        });

        fm_debugLog(`[STREAM] Creating write stream`);
        const writeStream = fs.createWriteStream(normalizedDest, {
            highWaterMark: FM_COPY_CONFIG.HIGH_WATER_MARK
        });

        // Track progress on data chunks
        readStream.on('data', (chunk) => {
            copiedBytes += chunk.length;
            const percent = Math.round((copiedBytes / totalSize) * 100);

            // Log every 10% progress
            if (percent >= lastProgressLog + 10) {
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = copiedBytes / elapsed;
                fm_debugLog(`[STREAM] Progress: ${percent}% (${fm_formatBytes(copiedBytes)}/${fm_formatBytes(totalSize)}) - Speed: ${fm_formatBytes(speed)}/s`);
                lastProgressLog = percent;
            }

            if (progressCallback) {
                progressCallback(copiedBytes, totalSize);
            }
        });

        // Handle read errors
        readStream.on('error', (err) => {
            fm_debugLog(`[STREAM] READ ERROR: ${err.message}`);
            writeStream.destroy();
            reject(new Error('Read error: ' + err.message));
        });

        // Handle write errors (common on NAS disconnects)
        writeStream.on('error', (err) => {
            fm_debugLog(`[STREAM] WRITE ERROR: ${err.message}`);
            readStream.destroy();
            reject(new Error('Write error: ' + err.message));
        });

        // Handle drain events (backpressure)
        writeStream.on('drain', () => {
            fm_debugLog(`[STREAM] Write stream drained (backpressure relieved)`);
        });

        // Success when write completes
        writeStream.on('finish', () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = totalSize / elapsed;
            fm_debugLog(`[STREAM] COMPLETE: ${fileName} in ${elapsed.toFixed(2)}s (${fm_formatBytes(speed)}/s)`);
            resolve({ success: true, size: totalSize });
        });

        // Pipe data from source to destination
        fm_debugLog(`[STREAM] Starting pipe...`);
        readStream.pipe(writeStream);
    });
}

// Copy file with automatic retry - handles transient NAS connection issues
async function fm_copyFileWithRetry(source, destination, maxRetries = FM_COPY_CONFIG.MAX_RETRIES, progressCallback) {
    const normalizedDest = normalizePathForPlatform(destination);
    const fileName = path.basename(source);
    let lastError;

    fm_debugLog(`[RETRY] Starting copy with max ${maxRetries} retries: ${fileName}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            fm_debugLog(`[RETRY] Attempt ${attempt}/${maxRetries}`);
            const result = await fm_copyFileStreaming(source, destination, progressCallback);
            fm_debugLog(`[RETRY] Success on attempt ${attempt}`);
            return result;
        } catch (err) {
            lastError = err;
            fm_debugLog(`[RETRY] Attempt ${attempt}/${maxRetries} FAILED: ${err.message}`);

            // Clean up partial/corrupted file on destination
            try {
                if (fs.existsSync(normalizedDest)) {
                    fs.unlinkSync(normalizedDest);
                    fm_debugLog(`[RETRY] Cleaned up partial file`);
                }
            } catch (cleanupErr) {
                fm_debugLog(`[RETRY] Could not clean up partial file: ${cleanupErr.message}`);
            }

            // Wait before retry with exponential backoff
            if (attempt < maxRetries) {
                const delay = FM_COPY_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
                fm_debugLog(`[RETRY] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries exhausted
    fm_debugLog(`[RETRY] FAILED after ${maxRetries} attempts`);
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
            const fileName = path.basename(normalizedSource);

            fm_debugLog(`[COPY] === Starting: ${fileName} ===`);

            // Check if source exists
            if (!fileExists(normalizedSource)) {
                fm_debugLog(`[COPY] ERROR: Source does not exist`);
                reject(new Error('Source file does not exist: ' + normalizedSource));
                return;
            }

            // Check if destination already exists
            if (fileExists(normalizedDest)) {
                fm_debugLog(`[COPY] SKIPPED: File already exists at destination`);
                resolve({ skipped: true, reason: 'File already exists' });
                return;
            }

            // Create destination directory
            const destDir = path.dirname(normalizedDest);
            fm_debugLog(`[COPY] Creating dest directory: ${destDir}`);
            const dirStartTime = Date.now();
            if (!createDirectory(destDir)) {
                fm_debugLog(`[COPY] ERROR: Failed to create directory`);
                reject(new Error('Failed to create destination directory'));
                return;
            }
            fm_debugLog(`[COPY] Directory ready in ${Date.now() - dirStartTime}ms`);

            // Get file stats
            let fileSize = 0;
            try {
                const stats = fs.statSync(normalizedSource);
                fileSize = stats.size;
                fm_debugLog(`[COPY] File size: ${fm_formatBytes(fileSize)}`);
            } catch (e) {
                fm_debugLog(`[COPY] Could not stat file: ${e.message}`);
            }

            // Determine if we should use streaming (large files or network paths)
            let useStreaming = false;
            const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

            if (fileSize > LARGE_FILE_THRESHOLD) {
                fm_debugLog(`[COPY] Large file detected (>${fm_formatBytes(LARGE_FILE_THRESHOLD)}), using streaming`);
                useStreaming = true;
            }

            // Check if destination looks like a network path (NAS, SMB, etc.)
            const isNetworkPath = normalizedDest.startsWith('/Volumes/') ||
                normalizedDest.startsWith('//') ||
                normalizedDest.match(/^[A-Z]:\\\\[^\\]+\\\\/i) ||
                normalizedDest.includes('\\\\');

            if (isNetworkPath) {
                fm_debugLog(`[COPY] Network path detected, using streaming`);
                useStreaming = true;
            }

            fm_debugLog(`[COPY] Mode: ${useStreaming ? 'STREAMING' : 'SYNC'}`);

            if (useStreaming) {
                // Use streaming copy with retry for large files and network destinations
                try {
                    const copyStartTime = Date.now();
                    const result = await fm_copyFileWithRetry(normalizedSource, normalizedDest);
                    fm_debugLog(`[COPY] === COMPLETE: ${fileName} in ${Date.now() - copyStartTime}ms ===`);
                    resolve(result);
                } catch (err) {
                    fm_debugLog(`[COPY] === FAILED: ${fileName} - ${err.message} ===`);
                    reject(err);
                }
            } else {
                // Use sync copy for small local files (faster)
                try {
                    fm_debugLog(`[COPY] Starting sync copy...`);
                    const copyStartTime = Date.now();
                    fs.copyFileSync(normalizedSource, normalizedDest);
                    fm_debugLog(`[COPY] === COMPLETE: ${fileName} in ${Date.now() - copyStartTime}ms (sync) ===`);
                    resolve({ success: true });
                } catch (err) {
                    fm_debugLog(`[COPY] === FAILED: ${fileName} - ${err.message} ===`);
                    reject(err);
                }
            }

        } catch (e) {
            fm_debugLog(`[COPY] EXCEPTION: ${e.message}`);
            reject(e);
        }
    });
}

// Copy multiple files with progress callback
async function copyFiles(fileList, progressCallback) {
    const results = [];
    const total = fileList.length;

    fm_debugLog(`========================================`);
    fm_debugLog(`[BATCH] Starting batch copy of ${total} files`);
    fm_debugLog(`========================================`);
    const batchStartTime = Date.now();

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        fm_debugLog(`[BATCH] File ${i + 1}/${total}: ${file.name}`);

        try {
            const result = await copyFile(file.source, file.destination);

            results.push({
                name: file.name,
                success: true,
                skipped: result.skipped || false,
                reason: result.reason || null
            });

        } catch (e) {
            fm_debugLog(`[BATCH] ERROR on file ${i + 1}: ${e.message}`);
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

    const batchElapsed = (Date.now() - batchStartTime) / 1000;
    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;

    fm_debugLog(`========================================`);
    fm_debugLog(`[BATCH] COMPLETE in ${batchElapsed.toFixed(2)}s`);
    fm_debugLog(`[BATCH] Success: ${successful}, Skipped: ${skipped}, Failed: ${failed}`);
    fm_debugLog(`========================================`);

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
