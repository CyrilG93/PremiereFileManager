// ExtendScript for Adobe// Premiere Pro File Manager Extension - ExtendScript Host
// This script runs in the Premiere Pro ExtendScript environment

// Platform detection
var IS_WINDOWS = ($.os.toLowerCase().indexOf('windows') >= 0);
var IS_MAC = !IS_WINDOWS;

// Platform-specific configuration
var PLATFORM_CONFIG = {
    // File stability check wait time (ms)
    fileStabilityWait: IS_WINDOWS ? 5000 : 3000, // Windows needs longer wait

    // File open mode for lock detection
    fileOpenMode: IS_WINDOWS ? 'r' : 'a', // Windows: read, Mac: append

    // Path separator
    pathSeparator: IS_WINDOWS ? '\\' : '/'
};

// Global blacklist for files that failed to import
// This prevents auto-import from retrying incompatible files in a loop
var FAILED_IMPORTS_BLACKLIST = {};

// Helper function to log platform-specific behavior
function logPlatform(message) {
    $.writeln('[' + (IS_WINDOWS ? 'WIN' : 'MAC') + '] ' + message);
}

// Helper function to decode URI-encoded paths (e.g., %20 -> space)
function decodeURIPath(path) {
    if (!path) return path;
    try {
        // Decode URI components (e.g., %20 -> space)
        return decodeURI(path);
    } catch (e) {
        // If decoding fails, return original path
        return path;
    }
}

// Get current project path
function FileManager_getProjectPath() {
    if (app.project && app.project.path) {
        return app.project.path;
    }
    return null;
}

// Get bin path recursively
function getBinPath(item) {
    var path = [];
    var current = item;
    var maxDepth = 20; // Safety limit
    var depth = 0;

    // Traverse up the hierarchy until we reach the root
    while (current && depth < maxDepth) {
        depth++;

        try {
            // Check if this item has a name (root doesn't)
            if (!current.name) {
                break; // We've reached the root
            }

            // Check if it's a bin by checking the type
            // In Premiere, bins have type === 2 (ProjectItemType.BIN)
            var isBin = false;
            try {
                isBin = (current.type === ProjectItemType.BIN);
            } catch (e) {
                // If type check fails, try another method
                // Bins have children, files don't
                isBin = (current.children && current.children.numItems !== undefined);
            }

            if (isBin) {
                path.unshift(current.name);
            }
        } catch (e) {
            // If we can't access properties, stop
            break;
        }

        current = current.parent;
    }

    return path.join('/');
}

// Analyze all project items recursively with bin path tracking
function analyzeProjectItems(item, fileList, currentBinPath) {
    if (!item) return;

    // Build the current bin path
    var binPath = currentBinPath || '';

    // If this item is a bin, add it to the path
    if (item.type === ProjectItemType.BIN && item.name) {
        binPath = binPath ? (binPath + '/' + item.name) : item.name;
    }

    // If it's a file (not a bin), add it to the list
    if (item.type === ProjectItemType.FILE || item.type === ProjectItemType.CLIP) {
        try {
            var filePath = item.getMediaPath();
            if (filePath && filePath !== '') {
                fileList.push({
                    name: item.name,
                    path: filePath,
                    binPath: binPath,
                    type: item.type.toString()
                });
            }
        } catch (e) {
            // Skip items without media path
        }
    }

    // Recurse into children (bins or files)
    if (item.children && item.children.numItems > 0) {
        for (var i = 0; i < item.children.numItems; i++) {
            analyzeProjectItems(item.children[i], fileList, binPath);
        }
    }
}

// Main function to analyze the entire project
function analyzeProject() {
    try {
        var project = app.project;

        if (!project) {
            return JSON.stringify({ error: "No active project" });
        }

        var fileList = [];
        var rootItem = project.rootItem;

        // Analyze all items starting from root with empty bin path
        analyzeProjectItems(rootItem, fileList, '');

        var result = {
            projectPath: FileManager_getProjectPath(),
            projectRoot: FileManager_getProjectRootPath(0), // Default to 0 (same folder as project)
            files: fileList,
            totalFiles: fileList.length
        };

        return JSON.stringify(result);

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Check if a file is outside the project folder
function isFileExternal(filePath, projectRoot) {
    if (!filePath || !projectRoot) return false;

    // Normalize paths for comparison
    // Replace backslashes with forward slashes and remove double slashes
    var normalizedFile = filePath.toLowerCase().replace(/\\/g, '/').replace(/\/\//g, '/');
    var normalizedRoot = projectRoot.toLowerCase().replace(/\\/g, '/').replace(/\/\//g, '/');

    // Ensure root ends with slash for proper comparison
    if (normalizedRoot.charAt(normalizedRoot.length - 1) !== '/') {
        normalizedRoot += '/';
    }

    return normalizedFile.indexOf(normalizedRoot) !== 0;
}

// Get files that need to be synchronized
function FileManager_getFilesToSync(rootPath, excludedFoldersJson) {
    try {
        var analysisResult = JSON.parse(analyzeProject());

        if (analysisResult.error) {
            return JSON.stringify(analysisResult);
        }

        var projectRoot = rootPath || analysisResult.projectRoot;
        if (!projectRoot) {
            return JSON.stringify({ error: "Cannot determine project root path" });
        }

        // Parse excluded folders list
        var excludedFolders = [];
        try {
            if (excludedFoldersJson) {
                excludedFolders = JSON.parse(excludedFoldersJson);
            }
        } catch (e) {
            // If parsing fails, use empty array
            excludedFolders = [];
        }

        var filesToSync = [];

        for (var i = 0; i < analysisResult.files.length; i++) {
            var file = analysisResult.files[i];

            if (isFileExternal(file.path, projectRoot)) {
                // Check if file is in an excluded folder
                var isExcluded = false;
                if (file.binPath && excludedFolders.length > 0) {
                    for (var j = 0; j < excludedFolders.length; j++) {
                        var excludedFolder = excludedFolders[j];
                        // Check if binPath starts with excluded folder name
                        if (file.binPath === excludedFolder ||
                            file.binPath.indexOf(excludedFolder + '/') === 0) {
                            isExcluded = true;
                            break;
                        }
                    }
                }

                // Skip if excluded
                if (isExcluded) {
                    continue;
                }

                // Extract filename from full path
                var sourceFile = new File(file.path);
                var fileName = decodeURIPath(sourceFile.name);  // Decode filename to prevent %20

                // Build target path properly
                var targetPath;
                if (file.binPath && file.binPath !== '') {
                    // Replace forward slashes with platform-specific separators
                    var binPathNormalized = file.binPath.replace(/\//g, '/');
                    targetPath = projectRoot + '/' + binPathNormalized + '/' + fileName;
                } else {
                    // File is at root level
                    targetPath = projectRoot + '/' + fileName;
                }

                filesToSync.push({
                    name: fileName,
                    currentPath: file.path,
                    binPath: file.binPath,
                    targetPath: targetPath
                });
            }
        }

        return JSON.stringify({
            rootPath: FileManager_getProjectRootPath(0), // Default to 0 (same folder as project)
            filesToSync: filesToSync,
            totalExternal: filesToSync.length
        });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Relink media after copying
function relinkMedia(oldPath, newPath) {
    try {
        if (!app.project || !app.project.rootItem) {
            return JSON.stringify({ success: false, error: "No project open" });
        }

        // Normalize paths for comparison (convert backslashes to forward slashes)
        var normalizedOldPath = oldPath.replace(/\\/g, '/').toLowerCase();

        // For changeMediaPath, we need to keep the original format
        // On Windows, Premiere expects backslashes
        var relinkPath = newPath;
        if (IS_WINDOWS) {
            // Ensure Windows path format (backslashes)
            relinkPath = newPath.replace(/\//g, '\\');
        }

        // Find the project item with the old path
        function findItemByPath(item, targetPath) {
            if (!item) return null;

            if (item.type === ProjectItemType.FILE || item.type === ProjectItemType.CLIP) {
                try {
                    var itemPath = item.getMediaPath();
                    if (itemPath && itemPath !== '') {
                        // Normalize item path for comparison
                        var normalizedItemPath = itemPath.replace(/\\/g, '/').toLowerCase();
                        if (normalizedItemPath === targetPath) {
                            return item;
                        }
                    }
                } catch (e) {
                    // Skip items without media path
                }
            }

            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) {
                    var found = findItemByPath(item.children[i], targetPath);
                    if (found) return found;
                }
            }

            return null;
        }

        var projectItem = findItemByPath(app.project.rootItem, normalizedOldPath);

        if (!projectItem) {
            return JSON.stringify({
                success: false,
                error: "Item not found in project: " + oldPath
            });
        }

        // Change path to new location
        // suppressWarnings = true to avoid dialog boxes
        try {
            projectItem.changeMediaPath(relinkPath, true);
            logPlatform('Relinked: ' + oldPath + ' -> ' + relinkPath);
            return JSON.stringify({ success: true });
        } catch (relinkError) {
            // If relink fails, provide detailed error
            logPlatform('Relink failed: ' + relinkError.toString());
            return JSON.stringify({
                success: false,
                error: "Relink failed: " + relinkError.toString()
            });
        }

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}
// Batch relink multiple files
function FileManager_batchRelinkMedia(relinkList) {
    try {
        var results = [];
        var list = JSON.parse(relinkList);

        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var success = relinkMedia(item.oldPath, item.newPath);
            results.push({
                file: item.name,
                success: success
            });
        }

        return JSON.stringify({ results: results });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Select folder dialog
function FileManager_selectFolder() {
    var folder = Folder.selectDialog("Sélectionner le dossier racine du projet");
    if (folder) {
        return folder.fsName;
    }
    return null;
}

// Get files to sync (export from project to folder)
function FileManager_getFilesToSync(rootPath, excludedFoldersJson, levels) {
    try {
        var analysisResult = JSON.parse(analyzeProject());

        if (analysisResult.error) {
            return JSON.stringify(analysisResult);
        }

        // Use provided levels or default to 0
        var levelsToUse = (levels !== undefined && levels !== null) ? levels : 0;

        var projectRoot = rootPath || FileManager_getProjectRootPath(levelsToUse);
        if (!projectRoot) {
            return JSON.stringify({ error: "Cannot determine project root path" });
        }

        // Parse excluded folders list
        var excludedFolders = [];
        try {
            if (excludedFoldersJson) {
                excludedFolders = JSON.parse(excludedFoldersJson);
            }
        } catch (e) {
            // If parsing fails, use empty array
            excludedFolders = [];
        }

        var filesToSync = [];

        for (var i = 0; i < analysisResult.files.length; i++) {
            var file = analysisResult.files[i];

            if (isFileExternal(file.path, projectRoot)) {
                // Check if file is in an excluded folder
                var isExcluded = false;
                if (file.binPath && excludedFolders.length > 0) {
                    for (var j = 0; j < excludedFolders.length; j++) {
                        var excludedFolder = excludedFolders[j];
                        // Check if binPath starts with excluded folder name
                        if (file.binPath === excludedFolder ||
                            file.binPath.indexOf(excludedFolder + '/') === 0) {
                            isExcluded = true;
                            break;
                        }
                    }
                }

                // Skip if excluded
                if (isExcluded) {
                    continue;
                }

                // Extract filename from full path
                var sourceFile = new File(file.path);
                var fileName = decodeURIPath(sourceFile.name);  // Decode filename to prevent %20

                // Build target path properly
                var targetPath;
                if (file.binPath && file.binPath !== '') {
                    // Replace forward slashes with platform-specific separators
                    var binPathNormalized = file.binPath.replace(/\//g, '/');
                    targetPath = projectRoot + '/' + binPathNormalized + '/' + fileName;
                } else {
                    // File is at root level
                    targetPath = projectRoot + '/' + fileName;
                }

                filesToSync.push({
                    name: fileName,
                    currentPath: file.path,
                    binPath: file.binPath,
                    targetPath: targetPath
                });
            }
        }

        return JSON.stringify({
            rootPath: getProjectRootPath(levelsToUse), // Use the determined levels
            filesToSync: filesToSync,
            totalExternal: filesToSync.length
        });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}


// Import-related functions for v2.0

// Recursively scan folder for all media files
function scanFolder(folder, fileList, currentPath, bannedExtensions, excludedFolderNames) {
    if (!folder || !folder.exists) return;

    try {
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) {
            try {
                var item = files[i];

                if (item instanceof Folder) {
                    // Check if folder name is excluded
                    var folderName = decodeURIPath(item.name);  // Decode folder name
                    var isExcludedName = false;
                    for (var k = 0; k < excludedFolderNames.length; k++) {
                        if (folderName === excludedFolderNames[k]) {
                            isExcludedName = true;
                            break;
                        }
                    }

                    if (!isExcludedName) {
                        // Recursively scan subfolder
                        var subPath = currentPath ? (currentPath + '/' + folderName) : folderName;
                        scanFolder(item, fileList, subPath, bannedExtensions, excludedFolderNames);
                    }
                } else if (item instanceof File) {
                    // Skip system files by name
                    var fileName = decodeURIPath(item.name);  // Decode filename
                    if (fileName === '.DS_Store' ||
                        fileName === 'Thumbs.db' ||
                        fileName === 'desktop.ini' ||
                        fileName.indexOf('.') === 0) { // Skip hidden files starting with .
                        continue;
                    }

                    // Check if extension is banned
                    var ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
                    var isBanned = false;

                    for (var j = 0; j < bannedExtensions.length; j++) {
                        if (ext === bannedExtensions[j].toLowerCase()) {
                            isBanned = true;
                            break;
                        }
                    }

                    if (!isBanned && item.exists) {
                        fileList.push({
                            name: fileName,
                            path: decodeURIPath(item.fsName),  // Decode file path
                            binPath: currentPath || '',
                            size: item.length || 0,
                            modified: item.modified ? item.modified.getTime() : 0
                        });
                    }
                }
            } catch (fileError) {
                // Skip files that cause errors (permissions, etc.)
                continue;
            }
        }
    } catch (e) {
        // Skip folders that cause errors
        return;
    }
}

// Check if file is stable (not being copied/written)
// This is critical for auto-import to avoid importing incomplete files
// Uses platform-specific configuration for optimal behavior
function isFileStable(filePath) {
    try {
        // Check 1: Try to open file exclusively (detects if file is locked)
        var testFile = new File(filePath);
        if (!testFile.exists) {
            return false;
        }

        // Try to open file - mode depends on platform
        // Windows: 'r' (read) works better for lock detection
        // Mac: 'a' (append) works better for lock detection
        var canOpen = testFile.open(PLATFORM_CONFIG.fileOpenMode);
        if (!canOpen) {
            // File is locked (being written)
            logPlatform('File locked: ' + filePath);
            return false;
        }
        testFile.close();

        // Check 2: Record initial size and modification time
        var size1 = testFile.length;
        var modified1 = testFile.modified ? testFile.modified.getTime() : 0;

        // Check if file is empty (still being created)
        if (size1 === 0) {
            logPlatform('File empty: ' + filePath);
            return false;
        }

        // Quick check: if file is older than 10 seconds, it's probably stable
        // This avoids waiting for files that are already complete
        var now = new Date().getTime();
        var fileAge = now - modified1;
        if (fileAge > 10000) { // 10 seconds old
            logPlatform('File old enough, assuming stable: ' + filePath);
            return true;
        }

        // File is recent, do a stability check with wait
        // Wait for file to stabilize - platform-specific duration
        // Windows: 5 seconds (often shows full size immediately but still writing)
        // Mac: 3 seconds (more accurate file system updates)
        logPlatform('File recent, checking stability: ' + filePath);
        $.sleep(PLATFORM_CONFIG.fileStabilityWait);

        // Check 3: Verify size and modification time haven't changed
        testFile = new File(filePath);
        if (!testFile.exists) {
            return false;
        }

        var size2 = testFile.length;
        var modified2 = testFile.modified ? testFile.modified.getTime() : 0;

        // File is stable only if both size AND modification time are unchanged
        if (size1 !== size2 || modified1 !== modified2) {
            logPlatform('File still changing: ' + filePath);
            return false;
        }

        // Check 4: Final verification - try to open again
        canOpen = testFile.open(PLATFORM_CONFIG.fileOpenMode);
        if (!canOpen) {
            logPlatform('File locked on recheck: ' + filePath);
            return false;
        }
        testFile.close();

        // All checks passed, file is stable
        logPlatform('File stable: ' + filePath);
        return true;
    } catch (e) {
        // Any error means file is not stable
        logPlatform('File stability check error: ' + e.toString());
        return false;
    }
}

// Get project root path based on project file location
// levels: how many parent levels to go up from the .prproj file folder
// 0 = same folder as .prproj, 1 = parent, 2 = grandparent, etc.
function getProjectRootPath(levels) {
    if (!app.project) {
        return null;
    }

    // Explicit type checking and default to 0
    if (typeof levels !== 'number' || levels < 0) {
        levels = 0;
    }

    // Get project file path
    var projectPath = app.project.path;
    if (!projectPath || projectPath === '') {
        return null;
    }

    // Normalize path separators (handle both Windows \ and Mac/Linux /)
    projectPath = projectPath.replace(/\\/g, '/');

    // Get the folder containing the .prproj file
    var projectFolder = projectPath.substring(0, projectPath.lastIndexOf('/'));

    // If levels is 0, return the project folder itself
    if (levels === 0) {
        return projectFolder;
    }

    // Go up the specified number of parent levels
    var currentPath = projectFolder;
    for (var i = 0; i < levels; i++) {
        var lastSlash = currentPath.lastIndexOf('/');
        if (lastSlash === -1) {
            // Can't go up anymore, return what we have
            break;
        }
        currentPath = currentPath.substring(0, lastSlash);
    }

    return currentPath;
}

// Helper function to get relative path from project root
// This makes file comparison portable across different computers/locations
function getRelativePath(absolutePath, projectRoot) {
    if (!absolutePath || !projectRoot) {
        return absolutePath;
    }

    // Normalize both paths (convert backslashes to forward slashes, lowercase)
    var normAbsolute = absolutePath.replace(/\\/g, '/').toLowerCase();
    var normRoot = projectRoot.replace(/\\/g, '/').toLowerCase();

    // Ensure root ends with /
    if (normRoot.charAt(normRoot.length - 1) !== '/') {
        normRoot += '/';
    }

    // Check if path starts with root
    if (normAbsolute.indexOf(normRoot) === 0) {
        // Return relative path from project root
        return normAbsolute.substring(normRoot.length);
    }

    // Fallback for files outside project root: return filename only
    // This handles edge cases where media is stored outside the project folder
    var lastSlash = normAbsolute.lastIndexOf('/');
    return lastSlash >= 0 ? normAbsolute.substring(lastSlash + 1) : normAbsolute;
}

// Get list of files already in project (as relative paths from project root)
function getProjectFilesList(projectRoot) {
    var fileList = [];

    if (!app.project || !app.project.rootItem) {
        return fileList;
    }

    function addProjectFiles(item) {
        if (!item) return;

        if (item.type === ProjectItemType.FILE || item.type === ProjectItemType.CLIP) {
            try {
                var mediaPath = item.getMediaPath();
                if (mediaPath && mediaPath !== '') {
                    // Decode URI-encoded path
                    mediaPath = decodeURIPath(mediaPath);

                    // Convert to relative path for portable comparison
                    var relativePath = getRelativePath(mediaPath, projectRoot);

                    // Debug: Log conversion
                    logPlatform('PROJECT FILE: ' + mediaPath + ' -> ' + relativePath);

                    fileList.push(relativePath);
                }
            } catch (e) {
                // Skip items without media path
            }
        }

        if (item.children && item.children.numItems > 0) {
            for (var i = 0; i < item.children.numItems; i++) {
                addProjectFiles(item.children[i]);
            }
        }
    }

    addProjectFiles(app.project.rootItem);
    return fileList;
}

// Scan for new files not in project
function FileManager_scanForNewFiles(rootPath, excludedFoldersJson, bannedExtensionsJson, excludedFolderNamesJson, levels) {
    try {
        // Use provided levels or default to 0
        var levelsToUse = (levels !== undefined && levels !== null) ? levels : 0;

        var projectRoot = rootPath || getProjectRootPath(levelsToUse);
        if (!projectRoot) {
            return JSON.stringify({ error: "Cannot determine project root path" });
        }

        // Parse excluded folders
        var excludedFolders = [];
        try {
            if (excludedFoldersJson) {
                excludedFolders = JSON.parse(excludedFoldersJson);
            }
        } catch (e) {
            excludedFolders = [];
        }

        // Parse banned extensions
        var bannedExtensions = [];
        try {
            if (bannedExtensionsJson) {
                bannedExtensions = JSON.parse(bannedExtensionsJson);
            }
        } catch (e) {
            bannedExtensions = [];
        }

        // Parse excluded folder names
        var excludedFolderNames = [];
        try {
            if (excludedFolderNamesJson) {
                excludedFolderNames = JSON.parse(excludedFolderNamesJson);
            }
        } catch (e) {
            excludedFolderNames = [];
        }

        // Get project root
        var projectRoot = rootPath || getProjectRootPath(levelsToUse);
        if (!projectRoot) {
            return JSON.stringify({ error: 'Could not determine project root' });
        }

        // Debug: Log project root
        logPlatform('========================================');
        logPlatform('PROJECT ROOT: ' + projectRoot);
        logPlatform('========================================');

        // Scan folder
        var rootFolder = new Folder(projectRoot);
        var scannedFiles = [];
        scanFolder(rootFolder, scannedFiles, '', bannedExtensions, excludedFolderNames);

        logPlatform('Total scanned files: ' + scannedFiles.length);

        // Get list of files already in project (as relative paths)
        var projectFiles = getProjectFilesList(projectRoot);

        logPlatform('Total project files: ' + projectFiles.length);
        logPlatform('========================================');

        // Create a lookup object with relative paths for faster comparison
        var projectFilePaths = {};
        for (var i = 0; i < projectFiles.length; i++) {
            var relativePath = projectFiles[i];
            if (relativePath && relativePath !== '') {
                projectFilePaths[relativePath] = true;
            }
        }

        // Find new files
        var newFiles = [];
        for (var i = 0; i < scannedFiles.length; i++) {
            var file = scannedFiles[i];

            // Check if in excluded folder
            var isExcluded = false;
            if (file.binPath && excludedFolders.length > 0) {
                for (var j = 0; j < excludedFolders.length; j++) {
                    var excludedFolder = excludedFolders[j];
                    if (file.binPath === excludedFolder ||
                        file.binPath.indexOf(excludedFolder + '/') === 0) {
                        isExcluded = true;
                        break;
                    }
                }
            }

            if (isExcluded) continue;

            // Convert to relative path for comparison (portable across computers)
            var relativeFilePath = getRelativePath(file.path, projectRoot);

            // Debug: Log conversion and comparison
            logPlatform('SCANNED FILE: ' + file.path + ' -> ' + relativeFilePath);

            // Primary comparison: relative path
            var alreadyInProject = projectFilePaths[relativeFilePath] === true;

            // Fallback comparison: if not found by relative path, try filename only
            // This handles cases where files were outside project root on PC but inside on Mac
            if (!alreadyInProject) {
                var filename = relativeFilePath.substring(relativeFilePath.lastIndexOf('/') + 1);
                alreadyInProject = projectFilePaths[filename] === true;

                if (alreadyInProject) {
                    logPlatform('✓ MATCH (by filename): ' + filename);
                }
            }

            // Also check blacklist using relative path
            var isBlacklisted = FAILED_IMPORTS_BLACKLIST[relativeFilePath] === true;

            // Debug: Log comparison result
            if (alreadyInProject) {
                logPlatform('✓ MATCH: File already in project (relative): ' + relativeFilePath);
            } else {
                logPlatform('✗ NEW: File not in project: ' + relativeFilePath);
            }

            if (isBlacklisted) {
                logPlatform('BLACKLIST CHECK: File is blacklisted: ' + relativeFilePath);
            }

            if (!alreadyInProject && !isBlacklisted && isFileStable(file.path)) {
                newFiles.push(file);
            } else if (isBlacklisted) {
                logPlatform('Skipping blacklisted file: ' + relativeFilePath);
            }
        }

        return JSON.stringify({
            projectRoot: projectRoot,
            newFiles: newFiles,
            totalNew: newFiles.length,
            debug: {
                projectRoot: projectRoot,
                totalScanned: scannedFiles.length,
                totalInProject: projectFiles.length,
                sampleProjectFiles: projectFiles.slice(0, 3), // First 3 files in project (relative paths)
                sampleScannedFiles: scannedFiles.slice(0, 3).map(function (f) {
                    return {
                        absolute: f.path,
                        relative: getRelativePath(f.path, projectRoot)
                    };
                })
            }
        });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Get project root path with optional levels up
function FileManager_getProjectRootPath(levels) {
    try {
        if (!app.project) {
            return JSON.stringify({ error: "No project open" });
        }

        // Explicit type checking - allow 0 as a valid level
        if (typeof levels !== 'number' || levels < 0) {
            levels = 0; // Default to 0 (same folder as project file)
        }

        return JSON.stringify({
            projectName: app.project.name,
            projectRoot: FileManager_getProjectRootPath(levels),
            projectPath: app.project.path
        });
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Create or get bin by path
function getOrCreateBin(binPath) {
    if (!binPath || binPath === '') {
        return app.project.rootItem;
    }

    var parts = binPath.split('/');
    var currentBin = app.project.rootItem;

    for (var i = 0; i < parts.length; i++) {
        var binName = parts[i];
        var found = false;

        // Search for existing bin
        if (currentBin.children && currentBin.children.numItems > 0) {
            for (var j = 0; j < currentBin.children.numItems; j++) {
                var child = currentBin.children[j];
                if (child.type === ProjectItemType.BIN && child.name === binName) {
                    currentBin = child;
                    found = true;
                    break;
                }
            }
        }

        // Create bin if not found
        if (!found) {
            currentBin = currentBin.createBin(binName);
        }
    }

    return currentBin;
}

// Import files to project
function FileManager_importFilesToProject(filesJson) {
    try {
        var files = JSON.parse(filesJson);
        var results = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            try {
                // Verify file exists before attempting import
                var fileObj = new File(file.path);
                if (!fileObj.exists) {
                    results.push({
                        name: file.name,
                        success: false,
                        error: 'Source file does not exist: ' + file.path
                    });
                    continue;
                }

                // Get or create bin
                var targetBin = getOrCreateBin(file.binPath);

                // Import file - importFiles expects an array of paths
                // This can throw errors for unsupported formats
                var importedItems = null;
                var importError = null;

                try {
                    importedItems = app.project.importFiles([file.path], true, targetBin, false);
                } catch (importEx) {
                    importError = importEx;
                }

                // Check if import failed
                if (importError) {
                    // Import failed - add to blacklist to prevent retry loops
                    var normalizedPath = file.path.replace(/\\/g, '/').toLowerCase();
                    FAILED_IMPORTS_BLACKLIST[normalizedPath] = true;

                    // Debug: Log blacklist addition and current state
                    logPlatform('BLACKLIST ADD: Added to blacklist: ' + file.path);
                    logPlatform('BLACKLIST ADD: Normalized path: ' + normalizedPath);
                    logPlatform('BLACKLIST ADD: Error was: ' + importError.toString());

                    // Count blacklist entries
                    var blacklistCount = 0;
                    for (var key in FAILED_IMPORTS_BLACKLIST) {
                        if (FAILED_IMPORTS_BLACKLIST.hasOwnProperty(key)) {
                            blacklistCount++;
                        }
                    }
                    logPlatform('BLACKLIST ADD: Total blacklisted files: ' + blacklistCount);

                    results.push({
                        name: file.name,
                        success: false,
                        error: importError.toString()
                    });
                } else if (importedItems && importedItems.length > 0) {
                    // Import succeeded with items
                    results.push({
                        name: file.name,
                        success: true,
                        binPath: file.binPath
                    });
                } else {
                    // Import may have succeeded even if no items returned (e.g., for sequences)
                    results.push({
                        name: file.name,
                        success: true,
                        binPath: file.binPath
                    });
                }
            } catch (e) {
                // Outer catch for any other errors (file access, etc.)
                var normalizedPath = file.path.replace(/\\/g, '/').toLowerCase();
                FAILED_IMPORTS_BLACKLIST[normalizedPath] = true;

                logPlatform('Import error, added to blacklist: ' + file.path + ' - ' + e.toString());

                results.push({
                    name: file.name,
                    success: false,
                    error: e.toString()
                });
            }
        }

        return JSON.stringify({
            results: results,
            totalImported: results.filter(function (r) { return r.success; }).length
        });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Base64 decode helper for ExtendScript
function base64Decode(str) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    var i = 0;

    str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');

    while (i < str.length) {
        var enc1 = chars.indexOf(str.charAt(i++));
        var enc2 = chars.indexOf(str.charAt(i++));
        var enc3 = chars.indexOf(str.charAt(i++));
        var enc4 = chars.indexOf(str.charAt(i++));

        var chr1 = (enc1 << 2) | (enc2 >> 4);
        var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        var chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }
    }

    // Decode UTF-8
    var result = '';
    var i = 0;
    var c1, c2, c3;

    while (i < output.length) {
        c1 = output.charCodeAt(i);

        if (c1 < 128) {
            result += String.fromCharCode(c1);
            i++;
        } else if ((c1 > 191) && (c1 < 224)) {
            c2 = output.charCodeAt(i + 1);
            result += String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            i += 2;
        } else {
            c2 = output.charCodeAt(i + 1);
            c3 = output.charCodeAt(i + 2);
            result += String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }

    return result;
}

// Import files using base64 encoded JSON (safer than escaping)
// Import files using base64 encoded JSON (safer for special characters)
function FileManager_importFilesToProjectBase64(base64Json) {
    try {
        var filesJson = base64Decode(base64Json);
        return FileManager_importFilesToProject(filesJson);
    } catch (e) {
        return JSON.stringify({ error: 'Base64 decode error: ' + e.toString() });
    }
}
