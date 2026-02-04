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

// Global log callback - can be set from main.js to log to UI
let fm_logCallback = null;

function fm_setLogCallback(callback) {
    fm_logCallback = callback;
}

// Debug logging helper - logs to both console and UI callback
function fm_debugLog(message, level = 'info') {
    const timestamp = new Date().toISOString().substr(11, 12);
    const formattedMsg = `[FM ${timestamp}] ${message}`;

    // Always log to console
    console.log(formattedMsg);

    // Also call the UI callback if set
    if (fm_logCallback && typeof fm_logCallback === 'function') {
        try {
            fm_logCallback(message, level);
        } catch (e) {
            console.error('Log callback error:', e);
        }
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

// Create directory recursively - NON-BLOCKING using setImmediate
function createDirectory(dirPath) {
    return new Promise((resolve) => {
        // Use setImmediate to not block the UI
        setImmediate(() => {
            try {
                if (!fs.existsSync(dirPath)) {
                    fm_debugLog(`Creating directory: ${dirPath}`);
                    const startTime = Date.now();
                    fs.mkdirSync(dirPath, { recursive: true });
                    fm_debugLog(`Directory created in ${Date.now() - startTime}ms`);
                }
                resolve(true);
            } catch (e) {
                fm_debugLog(`ERROR creating directory: ${e.message}`, 'error');
                resolve(false);
            }
        });
    });
}

// Streaming file copy - optimized for large files and NAS targets
// Uses streams with chunking to prevent EBADF errors on network mounts
function fm_copyFileStreaming(source, destination, progressCallback) {
    return new Promise((resolve, reject) => {
        const normalizedSource = normalizePathForPlatform(source);
        const normalizedDest = normalizePathForPlatform(destination);
        const fileName = path.basename(normalizedSource);

        fm_debugLog(`[STREAM] Starting: ${fileName}`);

        let stats;
        try {
            stats = fs.statSync(normalizedSource);
            fm_debugLog(`[STREAM] Size: ${fm_formatBytes(stats.size)}`);
        } catch (err) {
            fm_debugLog(`[STREAM] ERROR: Cannot stat: ${err.message}`, 'error');
            reject(new Error('Cannot read source file: ' + err.message));
            return;
        }

        const totalSize = stats.size;
        let copiedBytes = 0;
        let lastProgressLog = 0;
        const startTime = Date.now();
        let settled = false;  // Prevent double resolve/reject

        const readStream = fs.createReadStream(normalizedSource, {
            highWaterMark: FM_COPY_CONFIG.HIGH_WATER_MARK,
            autoClose: true
        });

        const writeStream = fs.createWriteStream(normalizedDest, {
            highWaterMark: FM_COPY_CONFIG.HIGH_WATER_MARK,
            autoClose: true
        });

        // Helper to check if file was successfully copied
        function verifyAndResolve() {
            if (settled) return false;

            try {
                // Give NAS a moment to sync
                const destStats = fs.statSync(normalizedDest);
                if (destStats.size === totalSize) {
                    // File copied successfully
                    settled = true;
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? totalSize / elapsed : 0;
                    fm_debugLog(`[STREAM] VERIFIED OK: ${fileName} (${fm_formatBytes(speed)}/s)`);
                    resolve({ success: true, size: totalSize });
                    return true;
                } else {
                    fm_debugLog(`[STREAM] Size mismatch: expected ${totalSize}, got ${destStats.size}`, 'warning');
                }
            } catch (e) {
                fm_debugLog(`[STREAM] Cannot verify destination: ${e.message}`, 'warning');
            }
            return false;
        }

        // Track progress on data chunks
        readStream.on('data', (chunk) => {
            copiedBytes += chunk.length;
            const percent = Math.round((copiedBytes / totalSize) * 100);

            // Log every 25% progress
            if (percent >= lastProgressLog + 25) {
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? copiedBytes / elapsed : 0;
                fm_debugLog(`[STREAM] ${percent}% - ${fm_formatBytes(speed)}/s`);
                lastProgressLog = percent;
            }

            if (progressCallback) {
                progressCallback(copiedBytes, totalSize);
            }
        });

        // Handle read errors - but check if all data was already read
        readStream.on('error', (err) => {
            if (settled) return;

            // EBADF on close after reading all data is OK on NAS
            // Check if we've read all the bytes
            if (err.code === 'EBADF' && copiedBytes >= totalSize) {
                fm_debugLog(`[STREAM] EBADF on close after 100% read, verifying...`);
                // Wait for NAS to flush writes, then verify
                setTimeout(() => {
                    if (settled) return;
                    if (!verifyAndResolve()) {
                        // Try one more time with longer delay
                        setTimeout(() => {
                            if (settled) return;
                            if (!verifyAndResolve()) {
                                settled = true;
                                fm_debugLog(`[STREAM] Verification failed after EBADF`, 'error');
                                reject(new Error('Read error: ' + err.message));
                            }
                        }, 500);
                    }
                }, 200);
            } else {
                fm_debugLog(`[STREAM] READ ERROR at ${Math.round(copiedBytes / totalSize * 100)}%: ${err.message}`, 'error');
                writeStream.destroy();
                settled = true;
                reject(new Error('Read error: ' + err.message));
            }
        });

        // Handle write errors (common on NAS disconnects)
        writeStream.on('error', (err) => {
            if (settled) return;

            // EBADF on close after all data written is OK
            if (err.code === 'EBADF' && copiedBytes >= totalSize) {
                fm_debugLog(`[STREAM] EBADF on write close after 100%, verifying...`);
                setTimeout(() => {
                    if (settled) return;
                    if (!verifyAndResolve()) {
                        setTimeout(() => {
                            if (settled) return;
                            if (!verifyAndResolve()) {
                                settled = true;
                                fm_debugLog(`[STREAM] Verification failed after write EBADF`, 'error');
                                reject(new Error('Write error: ' + err.message));
                            }
                        }, 500);
                    }
                }, 200);
            } else {
                fm_debugLog(`[STREAM] WRITE ERROR: ${err.message}`, 'error');
                readStream.destroy();
                settled = true;
                reject(new Error('Write error: ' + err.message));
            }
        });

        // Success when write completes
        writeStream.on('finish', () => {
            // Small delay to let any close errors settle, then verify
            setTimeout(() => {
                verifyAndResolve();
            }, 100);
        });

        // Pipe data from source to destination
        readStream.pipe(writeStream);
    });
}

// Copy file with automatic retry - handles transient NAS connection issues
async function fm_copyFileWithRetry(source, destination, maxRetries = FM_COPY_CONFIG.MAX_RETRIES, progressCallback) {
    const normalizedDest = normalizePathForPlatform(destination);
    const fileName = path.basename(source);
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 1) {
                fm_debugLog(`[RETRY] Attempt ${attempt}/${maxRetries}: ${fileName}`);
            }
            const result = await fm_copyFileStreaming(source, destination, progressCallback);
            return result;
        } catch (err) {
            lastError = err;
            fm_debugLog(`[RETRY] FAILED attempt ${attempt}: ${err.message}`, 'error');

            // Clean up partial/corrupted file on destination
            try {
                if (fs.existsSync(normalizedDest)) {
                    fs.unlinkSync(normalizedDest);
                    fm_debugLog(`[RETRY] Cleaned partial file`);
                }
            } catch (cleanupErr) {
                // Ignore cleanup errors
            }

            // Wait before retry with exponential backoff
            if (attempt < maxRetries) {
                const delay = FM_COPY_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
                fm_debugLog(`[RETRY] Waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Copy file - main entry point
// Uses streaming for large files (>50MB) or when destination looks like a network path
async function copyFile(source, destination) {
    const normalizedSource = normalizePathForPlatform(source);
    const normalizedDest = normalizePathForPlatform(destination);
    const fileName = path.basename(normalizedSource);

    fm_debugLog(`=== COPY: ${fileName} ===`);

    // Check if source exists
    if (!fileExists(normalizedSource)) {
        fm_debugLog(`ERROR: Source not found`, 'error');
        throw new Error('Source file does not exist: ' + normalizedSource);
    }

    // Check if destination already exists
    if (fileExists(normalizedDest)) {
        fm_debugLog(`SKIPPED: Already exists`);
        return { skipped: true, reason: 'File already exists' };
    }

    // Create destination directory (non-blocking)
    const destDir = path.dirname(normalizedDest);
    fm_debugLog(`Creating dir: ${destDir}`);
    const dirCreated = await createDirectory(destDir);
    if (!dirCreated) {
        fm_debugLog(`ERROR: Cannot create directory`, 'error');
        throw new Error('Failed to create destination directory');
    }

    // Get file stats
    let fileSize = 0;
    try {
        const stats = fs.statSync(normalizedSource);
        fileSize = stats.size;
        fm_debugLog(`Size: ${fm_formatBytes(fileSize)}`);
    } catch (e) {
        fm_debugLog(`Cannot stat file`, 'warning');
    }

    // Determine if we should use streaming (large files or network paths)
    let useStreaming = false;
    const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

    if (fileSize > LARGE_FILE_THRESHOLD) {
        fm_debugLog(`Large file, using streaming`);
        useStreaming = true;
    }

    // Check if destination looks like a network path (NAS, SMB, etc.)
    const isNetworkPath = normalizedDest.startsWith('/Volumes/') ||
        normalizedDest.startsWith('//') ||
        normalizedDest.match(/^[A-Z]:\\\\[^\\]+\\\\/i) ||
        normalizedDest.includes('\\\\');

    if (isNetworkPath) {
        fm_debugLog(`Network path detected, using streaming`);
        useStreaming = true;
    }

    if (useStreaming) {
        // Use streaming copy with retry for large files and network destinations
        return await fm_copyFileWithRetry(normalizedSource, normalizedDest);
    } else {
        // Use sync copy for small local files (faster)
        fm_debugLog(`Using sync copy (small local file)`);
        const startTime = Date.now();
        fs.copyFileSync(normalizedSource, normalizedDest);
        fm_debugLog(`DONE in ${Date.now() - startTime}ms`);
        return { success: true };
    }
}

// Copy multiple files with progress callback
// Each file copy yields to the event loop to prevent UI freeze
async function copyFiles(fileList, progressCallback) {
    const results = [];
    const total = fileList.length;

    fm_debugLog(`========================================`);
    fm_debugLog(`BATCH COPY: ${total} files`);
    fm_debugLog(`========================================`);
    const batchStartTime = Date.now();

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        fm_debugLog(`[${i + 1}/${total}] ${file.name}`);

        // Yield to event loop to allow UI to update
        await new Promise(resolve => setImmediate(resolve));

        try {
            const result = await copyFile(file.source, file.destination);

            results.push({
                name: file.name,
                success: true,
                skipped: result.skipped || false,
                reason: result.reason || null
            });

        } catch (e) {
            fm_debugLog(`ERROR: ${e.message}`, 'error');
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

        // Yield again after each file
        await new Promise(resolve => setImmediate(resolve));
    }

    const batchElapsed = (Date.now() - batchStartTime) / 1000;
    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;

    fm_debugLog(`========================================`);
    fm_debugLog(`BATCH DONE in ${batchElapsed.toFixed(1)}s`);
    fm_debugLog(`OK: ${successful}, Skip: ${skipped}, Fail: ${failed}`);
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
        formatFileSize,
        fm_setLogCallback  // Allow main.js to set the log callback
    };
}
