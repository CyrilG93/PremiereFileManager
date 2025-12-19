// ExtendScript for Adobe Premiere Pro File Manager
// Analyzes project files and manages synchronization

#target premierepro

// Get current project path
function getProjectPath() {
    if (app.project && app.project.path) {
        return app.project.path;
    }
    return null;
}

// Get the root folder path (parent of SEQUENCE folder)
function getProjectRootPath() {
    var projectPath = getProjectPath();
    if (!projectPath) return null;

    var file = new File(projectPath);
    var parentFolder = file.parent; // SEQUENCE folder
    if (parentFolder && parentFolder.parent) {
        return parentFolder.parent.fsName; // Project root folder
    }
    return null;
}

// Get bin path recursively
function getBinPath(item) {
    var path = [];
    var current = item;

    while (current && current.parent) {
        if (current.name && current.type === ProjectItemType.BIN) {
            path.unshift(current.name);
        }
        current = current.parent;
    }

    return path.join('/');
}

// Analyze all project items recursively
function analyzeProjectItems(item, fileList) {
    if (!item) return;

    // If it's a file (not a bin)
    if (item.type === ProjectItemType.FILE || item.type === ProjectItemType.CLIP) {
        try {
            var filePath = item.getMediaPath();
            if (filePath && filePath !== '') {
                var binPath = getBinPath(item.parent);

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

    // Recurse into bins
    if (item.children && item.children.numItems > 0) {
        for (var i = 0; i < item.children.numItems; i++) {
            analyzeProjectItems(item.children[i], fileList);
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

        // Analyze all items
        analyzeProjectItems(rootItem, fileList);

        var result = {
            projectPath: getProjectPath(),
            projectRoot: getProjectRootPath(),
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
    var normalizedFile = filePath.toLowerCase().replace(/\\/g, '/');
    var normalizedRoot = projectRoot.toLowerCase().replace(/\\/g, '/');

    return normalizedFile.indexOf(normalizedRoot) !== 0;
}

// Get files that need to be synchronized
function getFilesToSync(rootPath) {
    try {
        var analysisResult = JSON.parse(analyzeProject());

        if (analysisResult.error) {
            return JSON.stringify(analysisResult);
        }

        var projectRoot = rootPath || analysisResult.projectRoot;
        if (!projectRoot) {
            return JSON.stringify({ error: "Cannot determine project root path" });
        }

        var filesToSync = [];

        for (var i = 0; i < analysisResult.files.length; i++) {
            var file = analysisResult.files[i];

            if (isFileExternal(file.path, projectRoot)) {
                // Extract filename from full path
                var sourceFile = new File(file.path);
                var fileName = sourceFile.name;

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
            projectRoot: projectRoot,
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
        var project = app.project;
        if (!project) {
            return false;
        }

        // Find the project item with the old path
        function findItemByPath(item, targetPath) {
            if (!item) return null;

            if (item.type === ProjectItemType.FILE || item.type === ProjectItemType.CLIP) {
                try {
                    var itemPath = item.getMediaPath();
                    if (itemPath === targetPath) {
                        return item;
                    }
                } catch (e) { }
            }

            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) {
                    var found = findItemByPath(item.children[i], targetPath);
                    if (found) return found;
                }
            }

            return null;
        }

        var item = findItemByPath(project.rootItem, oldPath);
        if (item) {
            item.changeMediaPath(newPath, true);
            return true;
        }

        return false;

    } catch (e) {
        return false;
    }
}

// Batch relink multiple files
function batchRelinkMedia(relinkList) {
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
function selectFolder() {
    var folder = Folder.selectDialog("Sélectionner le dossier racine du projet");
    if (folder) {
        return folder.fsName;
    }
    return null;
}

// Get project info
function getProjectInfo() {
    try {
        var project = app.project;

        if (!project) {
            return JSON.stringify({ error: "No active project" });
        }

        var info = {
            name: project.name,
            path: project.path || null,
            rootPath: getProjectRootPath(),
            sequences: project.sequences.numSequences,
            rootItems: project.rootItem.children.numItems
        };

        return JSON.stringify(info);

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}
