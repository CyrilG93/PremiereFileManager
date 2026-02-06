// Main JavaScript for File Manager Extension

const csInterface = new CSInterface();
let currentFiles = [];
let currentMode = 'export'; // Track current mode: 'export' or 'import'

const GITHUB_REPO = 'CyrilG93/PremiereFileManager';
let CURRENT_VERSION = '1.2.0';

// Embedded translations (no async loading to avoid initialization issues)
const translations = {
    en: {
        settings: {
            title: "Settings",
            language: "Language",
            rootFolder: "Project Root Folder",
            rootFolderPlaceholder: "Auto-detect",
            rootFolderLevels: "Parent levels from project file",
            rootFolderLevelsHelp: "How many levels up from the project file folder (0 = same folder, 1 = parent, 2 = grandparent)",
            autoRelink: "Auto-relink media after consolidation",
            autoImport: "Auto-import",
            autoImportInterval: "Auto-import interval (seconds)",
            excludedFolders: "Folders excluded from consolidation",
            excludedFoldersPlaceholder: "Ex: TEMP, CACHE, BACKUP\nOne folder per line",
            excludedFolderNames: "Folder names to ignore on import",
            excludedFolderNamesPlaceholder: "Ex: node_modules, .git, Thumbs.db",
            bannedExtensions: "File extensions banned from import",
            bannedExtensionsPlaceholder: "Ex: .zip, .pptx, .exe\nOne extension per line"
        },
        buttons: {
            analyze: "Analyze",
            import: "Import",
            export: "Consolidate",
            selectAll: "All",
            deselectAll: "None",
            save: "Save",
            selectAllImport: "All",
            deselectAllImport: "None",
            selectAllExport: "All",
            deselectAllExport: "None"
        },
        compact: {
            import: "Import",
            export: "Consolidate"
        },
        labels: {
            project: "Project:",
            rootFolder: "Root folder:",
            current: "Current:",
            target: "Target:",
            bin: "Bin:",
            binDefault: "Root",
            offline: "offline"
        },
        results: {
            importTitle: "Files to Import",
            exportTitle: "Files to Consolidate",
            emptyImport: "No new files to import",
            emptyExport: "All files are consolidated",
            importSubtitle: "From folder → Premiere Pro",
            exportSubtitle: "From Premiere Pro → folder",
            importButton: "Import",
            exportButton: "Consolidate"
        },
        report: {
            title: "Consolidation Report",
            success: "Success",
            skipped: "Skipped (already exists)",
            failed: "Failed"
        },
        status: {
            analyzing: "Analyzing project...",
            searching: "Searching for new files...",
            importing: "Importing files...",
            exporting: "Consolidating files...",
            relinking: "Relinking media...",
            completed: "Operation completed",
            saved: "Settings saved",
            noNewFiles: "No new files to import",
            allSynced: "All files are consolidated",
            filesDetected: "file(s) detected",
            newFilesDetected: "new file(s) detected",
            filesImported: "file(s) imported successfully",
            filesExported: "file(s) consolidated successfully",
            autoImportStarted: "Auto-import started with interval",
            autoImportStopped: "Auto-import stopped",
            selectFolder: "Please select a root folder first",
            toImport: "to import",
            toExport: "to consolidate",
            noFilesToSync: "No files to synchronize",
            updateAvailable: "🚀 New version available! Click to update."
        }
    },
    fr: {
        settings: {
            title: "Paramètres",
            language: "Langue",
            rootFolder: "Dossier racine du projet",
            rootFolderPlaceholder: "Détection automatique",
            rootFolderLevels: "Niveaux parents depuis le fichier projet",
            rootFolderLevelsHelp: "Combien de niveaux remonter depuis le dossier du fichier projet (0 = même dossier, 1 = parent, 2 = grand-parent)",
            autoRelink: "Relier automatiquement les médias après la consolidation",
            autoImport: "Import automatique",
            autoImportInterval: "Intervalle d'import auto (secondes)",
            excludedFolders: "Dossiers exclus de la consolidation",
            excludedFoldersPlaceholder: "Ex: TEMP, CACHE, BACKUP\nUn dossier par ligne",
            excludedFolderNames: "Noms de dossiers à ignorer à l'import",
            excludedFolderNamesPlaceholder: "Ex: node_modules, .git, Thumbs.db",
            bannedExtensions: "Extensions de fichiers bannies à l'import",
            bannedExtensionsPlaceholder: "Ex: .zip, .pptx, .exe\nUne extension par ligne"
        },
        buttons: {
            analyze: "Analyser",
            import: "Importer",
            export: "Consolider",
            selectAll: "Tout",
            deselectAll: "Aucun",
            save: "Enregistrer",
            selectAllImport: "Tout",
            deselectAllImport: "Aucun",
            selectAllExport: "Tout",
            deselectAllExport: "Aucun"
        },
        compact: {
            import: "Importer",
            export: "Consolider"
        },
        labels: {
            project: "Projet:",
            rootFolder: "Dossier racine:",
            current: "Actuel:",
            target: "Cible:",
            bin: "Chutier:",
            binDefault: "Racine",
            offline: "hors ligne"
        },
        results: {
            importTitle: "Fichiers à Importer",
            exportTitle: "Fichiers à Consolider",
            emptyImport: "Aucun nouveau fichier à importer",
            emptyExport: "Tous les fichiers sont consolidés",
            importSubtitle: "Du dossier → Premiere Pro",
            exportSubtitle: "De Premiere Pro → dossier",
            importButton: "Importer",
            exportButton: "Consolider"
        },
        report: {
            title: "Rapport de Consolidation",
            success: "Succès",
            skipped: "Ignoré (existe déjà)",
            failed: "Échec"
        },
        status: {
            analyzing: "Analyse du projet...",
            searching: "Recherche de nouveaux fichiers...",
            importing: "Import des fichiers...",
            exporting: "Consolidation des fichiers...",
            relinking: "Liaison des médias...",
            completed: "Opération terminée",
            saved: "Paramètres enregistrés",
            noNewFiles: "Aucun nouveau fichier à importer",
            allSynced: "Tous les fichiers sont consolidés",
            filesDetected: "fichier(s) détecté(s)",
            newFilesDetected: "nouveau(x) fichier(s) détecté(s)",
            filesImported: "fichier(s) importé(s) avec succès",
            filesExported: "fichier(s) consolidé(s) avec succès",
            autoImportStarted: "Import automatique démarré avec intervalle",
            autoImportStopped: "Import automatique arrêté",
            selectFolder: "Veuillez d'abord sélectionner un dossier racine",
            toImport: "à importer",
            toExport: "à consolider",
            noFilesToSync: "Aucun fichier à synchroniser",
            updateAvailable: "🚀 Nouvelle version disponible ! Cliquez pour mettre à jour."
        }
    }
};

let currentLang = 'en'; // Default language

// Translation function
function t(key) {
    const keys = key.split('.');
    let value = translations[currentLang];

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return key; // Return key if translation not found
        }
    }

    return value;
}

// Update UI with current language
function updateUILanguage() {
    // Update text content and button values
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);

        if (el.tagName === 'INPUT' && el.type === 'button') {
            el.value = text;
        } else {
            el.textContent = text;
        }
    });

    // Update placeholders separately
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = t(key);
        el.placeholder = text;
    });
}

// Change language
function changeLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        updateUILanguage();

        // Save to settings
        settings.language = lang;
        fm_writeSettingsToFile(settings);
        localStorage.setItem('fileManagerSettings', JSON.stringify(settings));
    }
}

let settings = {
    rootFolder: '',
    rootFolderLevels: 0, // How many parent levels to go up from project file (0 = same folder, 1 = parent, 2 = grandparent)
    autoRelink: true,
    excludedFolders: [],
    excludedFolderNames: ['Premiere Pro Auto-Save', 'Adobe Premiere Pro Auto-Save'],
    bannedExtensions: [
        // Archives
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
        // Documents
        '.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls', '.pdf', '.txt', '.rtf', '.odt',
        // Executables
        '.exe', '.app', '.dmg', '.msi', '.bat', '.sh', '.cmd',
        // Temporary/System
        '.tmp', '.temp', '.part', '.download', '.crdownload', '.ini', '.log', '.db', '.cache',
        // Premiere/Adobe files
        '.prproj', '.prlock', '.aep', '.aet', '.pek', '.cfa', '.xmp', '.edl',
        // RAW photo formats (not supported by Premiere)
        '.arw', '.cr2', '.cr3', '.nef', '.nrw', '.orf', '.rw2', '.pef', '.raf', '.dng', '.raw',
        // Other image formats not supported
        '.indd', '.eps', '.bmp', '.ico', '.avif',
        // Audio formats not commonly used in video editing
        '.flac', '.ape', '.alac', '.wma', '.ogg', '.opus',
        // Other non-media
        '.html', '.css', '.js', '.json', '.xml', '.svg', '.md', '.clipchamp', '.ytdl', '.part',
    ],
    autoImport: false,
    autoImportInterval: 30,
    language: 'en' // Default language
};

// ============================================================================
// FILE-BASED SETTINGS STORAGE (persists across Premiere versions)
// ============================================================================
const fm_fs = require('fs');
const fm_path = require('path');
const fm_os = require('os');

/**
 * Get the path to the settings file (cross-platform)
 * macOS: ~/Library/Application Support/PremiereFileManager/settings.json
 * Windows: %APPDATA%/PremiereFileManager/settings.json
 */
function fm_getSettingsDir() {
    const platform = fm_os.platform();
    if (platform === 'darwin') {
        return fm_path.join(fm_os.homedir(), 'Library', 'Application Support', 'PremiereFileManager');
    } else {
        // Windows
        return fm_path.join(process.env.APPDATA || fm_os.homedir(), 'PremiereFileManager');
    }
}

function fm_getSettingsFilePath() {
    return fm_path.join(fm_getSettingsDir(), 'settings.json');
}

/**
 * Read settings from JSON file
 * Returns null if file doesn't exist or is invalid
 */
function fm_readSettingsFromFile() {
    try {
        const filePath = fm_getSettingsFilePath();
        if (fm_fs.existsSync(filePath)) {
            const data = fm_fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading settings file:', e);
    }
    return null;
}

/**
 * Write settings to JSON file
 */
function fm_writeSettingsToFile(settingsData) {
    try {
        const dir = fm_getSettingsDir();
        if (!fm_fs.existsSync(dir)) {
            fm_fs.mkdirSync(dir, { recursive: true });
        }
        const filePath = fm_getSettingsFilePath();
        fm_fs.writeFileSync(filePath, JSON.stringify(settingsData, null, 2), 'utf8');
        console.log('Settings saved to file:', filePath);
        return true;
    } catch (e) {
        console.error('Error writing settings file:', e);
        return false;
    }
}

// Load settings from localStorage or persistent file
function loadSettings() {
    let migratedFromLocalStorage = false;
    let loadedSettings = null;

    // First, try to load from JSON file (persistent across Premiere versions)
    const fileSettings = fm_readSettingsFromFile();

    if (fileSettings) {
        loadedSettings = fileSettings;
        console.log('Settings loaded from file:', fm_getSettingsFilePath());
    } else {
        // Fallback: migrate from localStorage
        const saved = localStorage.getItem('fileManagerSettings');
        if (saved) {
            try {
                loadedSettings = JSON.parse(saved);
                migratedFromLocalStorage = true;
                console.log('Settings migrated from localStorage');
            } catch (e) {
                console.error('Error loading settings from localStorage:', e);
            }
        }
    }

    // Default banned extensions list (keep in sync with settings object)
    const defaultBannedExtensions = [
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
        '.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls', '.pdf', '.txt', '.rtf', '.odt',
        '.exe', '.app', '.dmg', '.msi', '.bat', '.sh', '.cmd',
        '.tmp', '.temp', '.part', '.download', '.crdownload', '.ini', '.log', '.db', '.cache',
        '.prproj', '.prlock', '.aep', '.aet', '.mogrt', '.pek', '.cfa', '.xmp', '.edl',
        '.arw', '.cr2', '.cr3', '.nef', '.nrw', '.orf', '.rw2', '.pef', '.raf', '.dng', '.raw',
        '.indd', '.eps', '.bmp', '.ico', '.webp',
        '.flac', '.ape', '.alac', '.wma', '.ogg', '.opus',
        '.html', '.css', '.js', '.json', '.xml', '.svg', '.md', '.clipchamp', '.ytdl'
    ];

    if (loadedSettings) {
        // Merge user's custom banned extensions with defaults
        let mergedBannedExtensions = defaultBannedExtensions;
        if (loadedSettings.bannedExtensions && Array.isArray(loadedSettings.bannedExtensions)) {
            const extensionsSet = new Set([
                ...defaultBannedExtensions,
                ...loadedSettings.bannedExtensions
            ]);
            mergedBannedExtensions = Array.from(extensionsSet);
        }

        // Merge saved settings with defaults
        settings = {
            ...settings, // Start with defaults
            ...loadedSettings, // Override with saved values
            bannedExtensions: mergedBannedExtensions,
            excludedFolderNames: loadedSettings.excludedFolderNames || settings.excludedFolderNames,
            excludedFolders: loadedSettings.excludedFolders || settings.excludedFolders
        };

        // Load language if saved
        if (settings.language && translations[settings.language]) {
            currentLang = settings.language;
            updateUILanguage();
        }
    } else {
        // First time use - ensure defaults
        settings.bannedExtensions = defaultBannedExtensions;
        console.log('First use: Applied default settings');

        // Save defaults to file immediately
        fm_writeSettingsToFile(settings);
    }

    // If migrated from localStorage, save to file
    if (migratedFromLocalStorage) {
        fm_writeSettingsToFile(settings);
        console.log('Migration complete: settings saved to persistent file storage');
    }

    // Always sync back to localStorage as backup/legacy support
    localStorage.setItem('fileManagerSettings', JSON.stringify(settings));

    // Update UI fields with current settings (whether loaded or defaults)
    document.getElementById('rootFolder').value = settings.rootFolder || '';
    document.getElementById('rootFolderLevels').value = (typeof settings.rootFolderLevels === 'number') ? settings.rootFolderLevels : 0;
    document.getElementById('autoRelink').checked = settings.autoRelink !== false;
    document.getElementById('excludedFolders').value = (settings.excludedFolders || []).join('\n');
    document.getElementById('excludedFolderNames').value = (settings.excludedFolderNames || []).join('\n');
    document.getElementById('bannedExtensions').value = (settings.bannedExtensions || []).sort().join('\n');
    document.getElementById('autoImport').checked = settings.autoImport || false;
    document.getElementById('autoImportInterval').value = settings.autoImportInterval || 30;

    // Set language selectors (both header and settings)
    const langSelect = document.getElementById('languageSelect');
    const headerLangSelect = document.getElementById('headerLanguageSelect');
    const currentLangValue = settings.language || 'en';

    if (langSelect) {
        langSelect.value = currentLangValue;
    }
    if (headerLangSelect) {
        headerLangSelect.value = currentLangValue;
    }
}

// Save settings to persistent storage
function saveSettings() {
    settings.rootFolder = document.getElementById('rootFolder').value;
    settings.rootFolderLevels = parseInt(document.getElementById('rootFolderLevels').value) || 0;
    settings.autoRelink = document.getElementById('autoRelink').checked;

    // Parse excluded folders
    const excludedFoldersText = document.getElementById('excludedFolders').value;
    settings.excludedFolders = excludedFoldersText
        .split('\n')
        .map(f => f.trim())
        .filter(f => f !== '');

    // Parse excluded folder names
    const excludedFolderNamesText = document.getElementById('excludedFolderNames').value;
    settings.excludedFolderNames = excludedFolderNamesText
        .split('\n')
        .map(f => f.trim())
        .filter(f => f !== '');

    // Parse banned extensions
    const bannedExtensionsText = document.getElementById('bannedExtensions').value;
    settings.bannedExtensions = bannedExtensionsText
        .split('\n')
        .map(ext => ext.trim())
        .filter(ext => ext !== '')
        .map(ext => ext.startsWith('.') ? ext : '.' + ext) // Ensure dot prefix
        .sort(); // Sort alphabetically

    settings.autoImport = document.getElementById('autoImport').checked;
    settings.autoImportInterval = parseInt(document.getElementById('autoImportInterval').value) || 30;

    // Handle language change
    const newLang = document.getElementById('languageSelect').value;
    if (newLang !== settings.language) {
        changeLanguage(newLang);
    }

    // Save to persistent file storage
    fm_writeSettingsToFile(settings);
    // Also save to localStorage as backup
    localStorage.setItem('fileManagerSettings', JSON.stringify(settings));

    showStatus(t('status.saved'), 'success');

    // Refresh project info to update displayed root folder
    getProjectInfo();

    // Restart auto-import if enabled
    if (settings.autoImport) {
        startAutoImport();
    } else {
        stopAutoImport();
    }

    closeSettings();
}

// Show status message
function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = 'status-message visible ' + type;

    setTimeout(() => {
        statusEl.classList.remove('visible');
    }, 5000);
}

// Show/hide progress
function showProgress() {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        progressSection.classList.add('visible');
    } else {
        console.warn('progressSection not found');
    }
}

function hideProgress() {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        progressSection.classList.remove('visible');
    }
}

function updateProgress(percent, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
    if (progressText && message) {
        progressText.textContent = message;
    }
}

// Get project info
function getProjectInfo() {
    const levels = (typeof settings.rootFolderLevels === 'number') ? settings.rootFolderLevels : 0;
    console.log('getProjectInfo called with levels:', levels);
    csInterface.evalScript(`FileManager_getProjectInfo(${levels})`, (result) => {
        try {
            const info = JSON.parse(result);

            if (info.error) {
                showStatus('Erreur: ' + info.error, 'error');
                return;
            }

            console.log('Project root:', info.projectRoot);
            document.getElementById('projectName').textContent = info.projectName || '-';
            document.getElementById('projectRoot').textContent = info.projectRoot || '-';
        } catch (e) {
            console.error('getProjectInfo parse error:', e);
            showStatus('Erreur lors de la récupération des informations du projet', 'error');
        }
    });
}

// Unified analysis - scans for both import and export
let importFiles = [];
let exportFiles = [];

function analyzeAll() {
    try {
        console.log('analyzeAll called');

        const analyzeBtn = document.getElementById('analyzeBtn');
        if (!analyzeBtn) {
            console.error('Bouton Analyser introuvable!');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span>Analyse en cours...</span>';

        console.log('Calling showProgress...');
        showProgress();
        console.log('Calling updateProgress...');
        updateProgress(0, 'Analyse en cours...');

        // Use the EXACT same approach as auto-import which works
        const rootPath = (settings.rootFolder || '').replace(/\\/g, '\\\\'); // Escape backslashes for Windows
        const levels = settings.rootFolderLevels || 0;
        const excludedFolders = JSON.stringify(settings.excludedFolders || []);
        const bannedExtensions = JSON.stringify(settings.bannedExtensions || []);
        const excludedFolderNames = JSON.stringify(settings.excludedFolderNames || []);

        console.log('Preparing import script...');
        // First, scan for import files (same as auto-import)
        const importScript = `FileManager_scanForNewFiles("${rootPath}", '${excludedFolders}', '${bannedExtensions}', '${excludedFolderNames}', ${levels})`;

        console.log('PROJECT ROOT FOR IMPORT:', rootPath);
        console.log('Calling evalScript for import...');
        csInterface.evalScript(importScript, (importResult) => {
            console.log('Import scan result:', importResult);

            try {
                const importData = JSON.parse(importResult);

                // Display debug information in UI
                if (importData.debug) {
                    let debugHTML = '<strong>=== DEBUG INFO - IMPORT ===</strong>\n\n';
                    debugHTML += `Project Root: ${importData.debug.projectRoot}\n`;
                    debugHTML += `Files in project (total): ${importData.debug.totalInProject}\n`;
                    debugHTML += `Files scanned (total): ${importData.debug.totalScanned}\n`;
                    debugHTML += `Files detected as NEW: ${importData.newFiles ? importData.newFiles.length : 0}\n\n`;

                    debugHTML += '--- Sample PROJECT files (relative paths) ---\n';
                    if (importData.debug.sampleProjectFiles && importData.debug.sampleProjectFiles.length > 0) {
                        importData.debug.sampleProjectFiles.forEach((file, i) => {
                            debugHTML += `  ${i + 1}. ${file}\n`;
                        });
                    } else {
                        debugHTML += '  (no files in project)\n';
                    }

                    debugHTML += '\n--- Sample SCANNED files ---\n';
                    if (importData.debug.sampleScannedFiles && importData.debug.sampleScannedFiles.length > 0) {
                        importData.debug.sampleScannedFiles.forEach((file, i) => {
                            debugHTML += `  ${i + 1}. Absolute: ${file.absolute}\n`;
                            debugHTML += `     Relative: ${file.relative}\n`;
                        });
                    } else {
                        debugHTML += '  (no files scanned)\n';
                    }

                    // Display in UI
                    const debugSection = document.getElementById('debugSection');
                    const debugContent = document.getElementById('debugContent');
                    if (debugSection && debugContent) {
                        // Find the inner div for content
                        const debugInnerDiv = debugContent.querySelector('div') || debugContent;
                        debugInnerDiv.textContent = debugHTML;
                        debugSection.classList.remove('hidden');
                        debugSection.classList.add('visible');
                        // Keep it collapsed by default
                        debugContent.style.display = 'none';
                    }

                    // Also log to console if available
                    console.log('========================================');
                    console.log('=== DEBUG INFO - IMPORT ===');
                    console.log('========================================');
                    console.log('Project Root:', importData.debug.projectRoot);
                    console.log('Files in project (total):', importData.debug.totalInProject);
                    console.log('Files scanned (total):', importData.debug.totalScanned);
                    console.log('Files detected as NEW:', importData.newFiles ? importData.newFiles.length : 0);
                    console.log('---');
                    console.log('Sample PROJECT files (relative paths):');
                    if (importData.debug.sampleProjectFiles) {
                        importData.debug.sampleProjectFiles.forEach((file, i) => {
                            console.log(`  ${i + 1}. ${file}`);
                        });
                    }
                    console.log('---');
                    console.log('Sample SCANNED files:');
                    if (importData.debug.sampleScannedFiles) {
                        importData.debug.sampleScannedFiles.forEach((file, i) => {
                            console.log(`  ${i + 1}. Absolute: ${file.absolute}`);
                            console.log(`     Relative: ${file.relative}`);
                        });
                    }
                    console.log('========================================');
                }

                // Check if the result indicates an error from the ExtendScript side
                if (importData && importData.error) {
                    showStatus('Erreur lors de l\'analyse des fichiers à importer: ' + importData.error, 'error');
                    importFiles = []; // Ensure importFiles is empty on error
                } else if (importData && Array.isArray(importData.newFiles)) {
                    importFiles = importData.newFiles;
                    console.log(`${importFiles.length} fichiers trouvés pour l'importation.`);
                } else {
                    // This case handles unexpected formats, but doesn't necessarily mean an error
                    // if newFiles is just an empty array or missing.
                    console.warn('Scan for new files returned unexpected format or no files:', importData);
                    importFiles = [];
                }
            } catch (e) {
                console.error('Import scan parse error:', e);
                showStatus('Erreur lors de l\'analyse des fichiers à importer (parsing): ' + e.message, 'error');
                importFiles = [];
            }

            updateProgress(50, 'Scan export...');

            // Then scan for export files
            const exportScript = `FileManager_getFilesToSync("${rootPath}", '${excludedFolders}', ${levels})`;

            console.log('Calling evalScript for export...');
            csInterface.evalScript(exportScript, (exportResult) => {
                console.log('Export scan result:', exportResult);

                try {
                    const exportData = JSON.parse(exportResult);
                    exportFiles = exportData.filesToSync || [];
                    console.log('Export files:', exportFiles.length);
                } catch (e) {
                    console.error('Export parse error:', e);
                    exportFiles = [];
                }

                // Done - display results
                updateProgress(100, 'Terminé');
                hideProgress();

                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Analyser</span>';

                console.log('Displaying results...');
                displayDualResults();

                // Show appropriate status message
                if (importFiles.length === 0 && exportFiles.length === 0) {
                    showStatus(t('status.noFilesToSync'), 'success');
                } else {
                    showStatus(`${importFiles.length} ${t('status.toImport')}, ${exportFiles.length} ${t('status.toExport')}`, 'success');
                }
            });
        });
    } catch (error) {
        console.error('analyzeAll error:', error);
        showStatus('Erreur: ' + error.message, 'error');
    }
}

// Display results in dual columns
function displayDualResults() {
    const resultsSection = document.getElementById('resultsSection');
    if (!resultsSection) {
        console.error('resultsSection introuvable dans le HTML!');
        return;
    }

    const importFilesList = document.getElementById('importFilesList');
    const exportFilesList = document.getElementById('exportFilesList');

    if (!importFilesList || !exportFilesList) {
        console.error('importFilesList ou exportFilesList introuvable!');
        return;
    }

    // Show results section
    resultsSection.classList.add('visible');

    // Display import files
    importFilesList.innerHTML = '';
    if (importFiles.length === 0) {
        importFilesList.innerHTML = `<div class="empty-state"><p>${t('results.emptyImport')}</p></div>`;
    } else {
        importFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `import-file-${index}`;
            checkbox.checked = true;
            checkbox.setAttribute('data-index', index);
            checkbox.addEventListener('change', updateImportCount);

            const fileDetails = document.createElement('div');
            fileDetails.className = 'file-details';
            fileDetails.innerHTML = `
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-bin">📁 ${escapeHtml(file.binPath || t('labels.binDefault'))}</div>
                <div class="file-path">${escapeHtml(file.path || '')}</div>
            `;

            fileItem.appendChild(checkbox);
            fileItem.appendChild(fileDetails);
            importFilesList.appendChild(fileItem);
        });
    }

    // Display export files
    exportFilesList.innerHTML = '';
    if (exportFiles.length === 0) {
        exportFilesList.innerHTML = `<div class="empty-state"><p>${t('results.emptyExport')}</p></div>`;
    } else {
        // Display export files (right column)
        exportFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `export-file-${index}`;
            checkbox.checked = true; // Keep checked by default as per original behavior
            checkbox.setAttribute('data-index', index); // Keep data-index as per original behavior
            checkbox.addEventListener('change', updateExportCount);

            const label = document.createElement('label');
            label.htmlFor = `export-file-${index}`;

            const fileName = document.createElement('div');
            fileName.className = 'file-name';

            // Check if file exists (offline indicator)
            const fileExists = window.cep && window.cep.fs ?
                window.cep.fs.stat(file.currentPath).err === 0 : true;

            if (!fileExists) {
                fileName.innerHTML = `${escapeHtml(file.name)} <span class="offline-badge">(${t('labels.offline')})</span>`;
            } else {
                fileName.textContent = escapeHtml(file.name); // Escape HTML for file name
            }

            const fileBin = document.createElement('div'); // Add file-bin as per original
            fileBin.className = 'file-bin';
            fileBin.innerHTML = `📁 ${escapeHtml(file.binPath || t('labels.binDefault'))}`;

            const filePath = document.createElement('div');
            filePath.className = 'file-path';
            filePath.textContent = `${t('labels.current')}: ${escapeHtml(file.currentPath || '')}`; // Escape HTML for file path

            label.appendChild(fileName);
            label.appendChild(fileBin); // Append file-bin
            label.appendChild(filePath);

            fileItem.appendChild(checkbox);
            fileItem.appendChild(label);
            exportFilesList.appendChild(fileItem);
        });
    }

    updateImportCount();
    updateExportCount();
}

// Update file counts
function updateImportCount() {
    const checked = document.querySelectorAll('#importFilesList input[type="checkbox"]:checked').length;
    document.getElementById('importCount').textContent = checked;
    document.getElementById('importBtn').disabled = checked === 0;
}

function updateExportCount() {
    const checked = document.querySelectorAll('#exportFilesList input[type="checkbox"]:checked').length;
    document.getElementById('exportCount').textContent = checked;
    document.getElementById('exportBtn').disabled = checked === 0;
}

// Export selected files
async function exportSelected() {
    const selectedFiles = exportFiles.filter((_, index) => {
        const checkbox = document.getElementById(`export-file-${index}`);
        return checkbox && checkbox.checked;
    });

    if (selectedFiles.length === 0) {
        showStatus('Aucun fichier sélectionné', 'warning');
        return;
    }

    const exportBtn = document.getElementById('exportBtn');
    exportBtn.disabled = true;

    // Show consolidation progress section
    showConsolidationProgress(selectedFiles.length);

    try {
        // Prepare file list for copying (same format as old synchronizeFiles)
        const filesToCopy = selectedFiles.map(file => ({
            name: file.name,
            source: file.currentPath,
            destination: file.targetPath
        }));

        const startTime = Date.now();

        // Use the Node.js copyFiles function from fileOperations.js
        const results = await copyFiles(filesToCopy, (progress) => {
            updateConsolidationProgress(progress.current, progress.total, filesToCopy[progress.current - 1]?.name || '', startTime);
        });

        // Ensure results is an array
        if (!Array.isArray(results)) {
            console.error('copyFiles did not return an array:', results);
            throw new Error('Export failed: invalid results format');
        }

        // Relink media in Premiere Pro to point to new location
        if (settings.autoRelink) {
            updateConsolidationProgressText('Liaison des médias...');

            const relinkList = results
                .filter(r => r.success && !r.skipped)
                .map((r, i) => {
                    // Escape backslashes for Windows in file paths
                    const oldPath = selectedFiles[i].currentPath.replace(/\\/g, '\\\\');
                    const newPath = selectedFiles[i].targetPath.replace(/\\/g, '\\\\');
                    return {
                        name: r.name,
                        oldPath: oldPath,
                        newPath: newPath
                    };
                });

            if (relinkList.length > 0) {
                await new Promise((resolve) => {
                    const relinkJson = JSON.stringify(relinkList);
                    csInterface.evalScript(`FileManager_batchRelinkMedia('${relinkJson}')`, (result) => {
                        console.log('Relink result:', result);
                        resolve();
                    });
                });
            }
        }

        // Hide progress after short delay
        setTimeout(() => {
            hideConsolidationProgress();
        }, 1000);

        const successCount = results.filter(r => r.success).length;
        const skippedCount = results.filter(r => r.skipped).length;
        const errorCount = results.filter(r => !r.success).length;

        if (errorCount === 0) {
            showStatus(`Export terminé: ${successCount} fichier(s) copié(s), ${skippedCount} ignoré(s)`, 'success');
        } else {
            showStatus(`Export terminé avec ${errorCount} erreur(s)`, 'warning');
        }

        exportBtn.disabled = false;

        // Refresh analysis
        analyzeAll();

    } catch (e) {
        console.error('Export error:', e);
        showStatus('Erreur lors de l\'export: ' + e.message, 'error');
        exportBtn.disabled = false;
        hideConsolidationProgress();
    }
}

// Consolidation Progress Functions
function showConsolidationProgress(totalFiles) {
    const section = document.getElementById('consolidationProgress');
    if (section) {
        section.classList.remove('hidden');
        updateConsolidationProgress(0, totalFiles, 'Préparation...', Date.now());
    }
}

function hideConsolidationProgress() {
    const section = document.getElementById('consolidationProgress');
    if (section) {
        section.classList.add('hidden');
    }
}

function updateConsolidationProgress(current, total, currentFileName, startTime) {
    const barFill = document.getElementById('consolidationBarFill');
    const percent = document.getElementById('consolidationPercent');
    const stats = document.getElementById('consolidationStats');
    const currentFile = document.getElementById('consolidationCurrentFile');
    const speed = document.getElementById('consolidationSpeed');

    const percentValue = total > 0 ? Math.round((current / total) * 100) : 0;

    if (barFill) barFill.style.width = percentValue + '%';
    if (percent) percent.textContent = percentValue + '%';
    if (stats) stats.textContent = `${current} / ${total} fichiers`;
    if (currentFile) currentFile.textContent = currentFileName || 'En attente...';

    // Calculate speed
    if (speed && startTime && current > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const filesPerSecond = current / elapsed;
        const remaining = total - current;
        const eta = remaining > 0 ? Math.round(remaining / filesPerSecond) : 0;

        if (eta > 60) {
            speed.textContent = `~${Math.round(eta / 60)} min restantes`;
        } else if (eta > 0) {
            speed.textContent = `~${eta}s restantes`;
        } else {
            speed.textContent = 'Finalisation...';
        }
    }
}

function updateConsolidationProgressText(message) {
    const currentFile = document.getElementById('consolidationCurrentFile');
    if (currentFile) currentFile.textContent = message;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debug logging
function debugLog(message, level = 'info') {
    // Always log to console
    console.log(`[${level}] ${message}`);

    // Try to log to UI if elements exist
    try {
        const debugLogs = document.getElementById('debugLogs');
        const debugLogsSection = document.getElementById('debugLogsSection');
        const debugLogsContent = document.getElementById('debugLogsContent');

        if (!debugLogs || !debugLogsSection) return; // Elements don't exist yet

        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'debug-log-entry';
        logEntry.innerHTML = `
            <span class="debug-log-time">${time}</span>
            <span class="debug-log-level ${level}">[${level.toUpperCase()}]</span>
            <span class="debug-log-message">${escapeHtml(message)}</span>
        `;

        debugLogs.appendChild(logEntry);
        debugLogs.scrollTop = debugLogs.scrollHeight;

        // Don't auto-open the debug panel - let the user control it
    } catch (e) {
        // Silently fail if UI logging doesn't work
        console.error('Debug log UI error:', e);
    }
}

function clearDebugLogs() {
    const debugLogs = document.getElementById('debugLogs');
    const debugLogsContent = document.getElementById('debugLogsContent');
    const toggleIcon = document.getElementById('debugLogsToggleIcon');

    if (debugLogs) debugLogs.innerHTML = '';
    if (debugLogsContent) debugLogsContent.style.display = 'none';
    if (toggleIcon) toggleIcon.classList.remove('open');
}

function toggleDebugLogsSection() {
    const debugLogsContent = document.getElementById('debugLogsContent');
    const toggleIcon = document.getElementById('debugLogsToggleIcon');

    if (debugLogsContent) {
        const isOpen = debugLogsContent.style.display !== 'none';
        debugLogsContent.style.display = isOpen ? 'none' : 'block';
        if (toggleIcon) {
            toggleIcon.classList.toggle('open', !isOpen);
        }
    }
}

// Update file counts
function updateImportCount() {
    const checked = document.querySelectorAll('#importFilesList input[type="checkbox"]:checked').length;
    document.getElementById('importCount').textContent = checked;
    document.getElementById('importBtn').disabled = checked === 0;
}

function updateExportCount() {
    const checked = document.querySelectorAll('#exportFilesList input[type="checkbox"]:checked').length;
    document.getElementById('exportCount').textContent = checked;
    document.getElementById('exportBtn').disabled = checked === 0;
}

// Selection controls for import
function selectAllImport() {
    document.querySelectorAll('#importFilesList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateImportCount();
}

function deselectAllImport() {
    document.querySelectorAll('#importFilesList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateImportCount();
}

// Selection controls for export
function selectAllExport() {
    document.querySelectorAll('#exportFilesList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateExportCount();
}

function deselectAllExport() {
    document.querySelectorAll('#exportFilesList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateExportCount();
}

// Synchronize files
async function synchronizeFiles() {
    const selectedFiles = [];

    document.querySelectorAll('.file-item input[type="checkbox"]:checked').forEach(cb => {
        const index = parseInt(cb.dataset.index);
        selectedFiles.push(currentFiles[index]);
    });

    if (selectedFiles.length === 0) {
        showStatus('Aucun fichier sélectionné', 'warning');
        return;
    }

    const syncBtn = document.getElementById('syncBtn');
    syncBtn.disabled = true;

    updateProgress(0, 'Préparation de la synchronisation...');

    // Prepare file list for copying
    const filesToCopy = selectedFiles.map(file => ({
        name: file.name,
        source: file.currentPath,
        destination: file.targetPath
    }));

    try {
        // Copy files using Node.js
        const results = await copyFiles(filesToCopy, (progress) => {
            updateProgress(progress.percent, `Copie en cours... ${progress.current}/${progress.total}`);
        });

        // Relink media if enabled
        if (settings.autoRelink) {
            updateProgress(100, 'Liaison des médias...');

            const relinkList = results
                .filter(r => r.success && !r.skipped)
                .map((r, i) => ({
                    name: r.name,
                    oldPath: selectedFiles[i].currentPath,
                    newPath: selectedFiles[i].targetPath
                }));

            if (relinkList.length > 0) {
                await new Promise((resolve) => {
                    csInterface.evalScript(`FileManager_batchRelinkMedia('${JSON.stringify(relinkList)}')`, (result) => {
                        resolve();
                    });
                });
            }
        }

        hideProgress();
        syncBtn.disabled = false;

        const successCount = results.filter(r => r.success).length;
        const skippedCount = results.filter(r => r.skipped).length;
        const errorCount = results.filter(r => !r.success).length;

        if (errorCount === 0) {
            showStatus(`Synchronisation terminée: ${successCount} fichier(s) copié(s), ${skippedCount} ignoré(s)`, 'success');
        } else {
            showStatus(`Synchronisation terminée avec ${errorCount} erreur(s)`, 'warning');
        }

    } catch (e) {
        hideProgress();
        syncBtn.disabled = false;
        showStatus('Erreur lors de la synchronisation: ' + e.message, 'error');
    }
}

// Display sync report
function displayReport(results) {
    const reportList = document.getElementById('reportList');
    if (!reportList) {
        console.warn('reportList element not found in HTML');
        return;
    }

    reportList.innerHTML = '';

    // If results is empty or not provided, show success message
    if (!results || results.length === 0) {
        reportList.innerHTML = '<div class="report-item success"><span class="report-icon">✓</span><span class="report-message">Opération terminée avec succès</span></div>';
        return;
    }

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = `report-item ${result.success ? 'success' : 'error'}`;

        const icon = result.success ? '✓' : '✗';
        const message = result.message || result.error || 'Opération effectuée';

        item.innerHTML = `
            <span class="report-icon">${icon}</span>
            <span class="report-message">${escapeHtml(message)}</span>
        `;

        reportList.appendChild(item);
    });
}

// Open settings
function openSettings() {
    document.getElementById('settingsPanel').classList.add('open');
}

// Close settings
function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('open');
}

// Browse for root folder
function browseRootFolder() {
    csInterface.evalScript('FileManager_selectFolder()', (result) => {
        if (result && result !== 'null') {
            document.getElementById('rootFolder').value = result;
        }
    });
}

// Compact mode: Quick synchronize (analyze + sync all)
async function compactSync() {
    const compactBtn = document.getElementById('compactSyncBtn');
    const compactStatus = document.getElementById('compactStatus');

    compactBtn.disabled = true;
    compactStatus.textContent = 'Analyse...';

    const rootPath = settings.rootFolder || '';
    const levels = settings.rootFolderLevels || 0;
    const excludedFolders = JSON.stringify(settings.excludedFolders || []);
    const scriptCall = rootPath
        ? `FileManager_getFilesToSync("${rootPath}", '${excludedFolders}', ${levels})`
        : `FileManager_getFilesToSync('', '${excludedFolders}', ${levels})`;

    csInterface.evalScript(scriptCall, async (result) => {
        try {
            const data = JSON.parse(result);

            if (data.error) {
                compactStatus.textContent = 'Erreur: ' + data.error;
                compactBtn.disabled = false;
                return;
            }

            const filesToSync = data.filesToSync || [];

            if (filesToSync.length === 0) {
                compactStatus.textContent = 'Aucun fichier à synchroniser';
                compactBtn.disabled = false;
                return;
            }

            compactStatus.textContent = `Copie de ${filesToSync.length} fichier(s)...`;

            // Prepare file list for copying
            const filesToCopy = filesToSync.map(file => ({
                name: file.name,
                source: file.currentPath,
                destination: file.targetPath
            }));

            // Copy files
            const results = await copyFiles(filesToCopy, (progress) => {
                compactStatus.textContent = `${progress.current}/${progress.total}`;
            });

            // Relink media if enabled
            if (settings.autoRelink) {
                compactStatus.textContent = 'Liaison...';

                const relinkList = results
                    .filter(r => r.success && !r.skipped)
                    .map((r, i) => ({
                        name: r.name,
                        oldPath: filesToSync[i].currentPath,
                        newPath: filesToSync[i].targetPath
                    }));

                if (relinkList.length > 0) {
                    await new Promise((resolve) => {
                        csInterface.evalScript(`FileManager_batchRelinkMedia('${JSON.stringify(relinkList)}')`, () => {
                            resolve();
                        });
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            compactStatus.textContent = `✓ ${successCount} fichier(s) synchronisé(s)`;
            compactBtn.disabled = false;

        } catch (e) {
            compactStatus.textContent = 'Erreur: ' + e.message;
            compactBtn.disabled = false;
        }
    });
}

// Smart sync function that routes to the correct function based on mode
function smartSync() {
    if (currentMode === 'import') {
        importFiles();
    } else {
        synchronizeFiles();
    }
}

// Compact mode: One-click import (analyze + import all)
async function compactImport() {
    const compactImportBtn = document.getElementById('compactImportBtn');

    compactImportBtn.disabled = true;

    const rootPath = (settings.rootFolder || '').replace(/\\/g, '\\\\');
    const levels = settings.rootFolderLevels || 0;
    const excludedFolders = JSON.stringify(settings.excludedFolders || []);
    const bannedExtensions = JSON.stringify(settings.bannedExtensions || []);
    const excludedFolderNames = JSON.stringify(settings.excludedFolderNames || []);
    const importScript = `FileManager_scanForNewFiles("${rootPath}", '${excludedFolders}', '${bannedExtensions}', '${excludedFolderNames}', ${levels})`;

    csInterface.evalScript(importScript, (importResult) => {
        try {
            const importData = JSON.parse(importResult);
            const filesToImport = importData.newFiles || [];

            if (filesToImport.length === 0) {
                compactImportBtn.disabled = false;
                return;
            }

            // Import all files
            const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(filesToImport))));
            csInterface.evalScript(`FileManager_importFilesToProjectBase64('${base64Data}')`, (result) => {
                compactImportBtn.disabled = false;
            });
        } catch (e) {
            compactImportBtn.disabled = false;
        }
    });
}

// Compact mode: One-click export (analyze + export all)
async function compactExport() {
    const compactExportBtn = document.getElementById('compactExportBtn');

    compactExportBtn.disabled = true;

    const rootPath = (settings.rootFolder || '').replace(/\\/g, '\\\\');
    const levels = settings.rootFolderLevels || 0;
    const excludedFolders = JSON.stringify(settings.excludedFolders || []);
    const exportScript = `FileManager_getFilesToSync("${rootPath}", '${excludedFolders}', ${levels})`;

    csInterface.evalScript(exportScript, async (exportResult) => {
        try {
            const exportData = JSON.parse(exportResult);
            const filesToExport = exportData.filesToSync || [];

            if (filesToExport.length === 0) {
                compactExportBtn.disabled = false;
                return;
            }

            // Export all files
            const filesToCopy = filesToExport.map(file => ({
                name: file.name,
                source: file.currentPath,
                destination: file.targetPath
            }));

            const results = await copyFiles(filesToCopy);

            // Ensure results is an array
            if (!Array.isArray(results)) {
                console.error('copyFiles did not return an array:', results);
                compactExportBtn.disabled = false;
                return;
            }

            // Relink if enabled
            if (settings.autoRelink) {
                const relinkList = results
                    .filter(r => r.success && !r.skipped)
                    .map((r, i) => {
                        // Escape backslashes for Windows in file paths
                        const oldPath = filesToExport[i].currentPath.replace(/\\/g, '\\\\');
                        const newPath = filesToExport[i].targetPath.replace(/\\/g, '\\\\');
                        return {
                            name: r.name,
                            oldPath: oldPath,
                            newPath: newPath
                        };
                    });

                if (relinkList.length > 0) {
                    await new Promise((resolve) => {
                        const relinkJson = JSON.stringify(relinkList);
                        csInterface.evalScript(`FileManager_batchRelinkMedia('${relinkJson}')`, () => resolve());
                    });
                }
            }

            compactExportBtn.disabled = false;
        } catch (e) {
            compactExportBtn.disabled = false;
        }
    });
}

// Auto-import functionality
let autoImportTimer = null;
let isImporting = false; // Lock to prevent multiple simultaneous imports

function analyzeForImport() {
    const importBtn = document.getElementById('importBtn');
    importBtn.disabled = true;
    importBtn.innerHTML = '<span>Analyse en cours...</span>';

    updateProgress(0, 'Recherche de nouveaux fichiers...');

    const rootPath = settings.rootFolder || '';
    const levels = settings.rootFolderLevels || 0;
    const excludedFolders = JSON.stringify(settings.excludedFolders || []);
    const bannedExtensions = JSON.stringify(settings.bannedExtensions || []);
    const excludedFolderNames = JSON.stringify(settings.excludedFolderNames || []);
    const scriptCall = `FileManager_scanForNewFiles("${rootPath}", '${excludedFolders}', '${bannedExtensions}', '${excludedFolderNames}', ${levels})`;

    csInterface.evalScript(scriptCall, (result) => {
        try {
            const data = JSON.parse(result);

            if (data.error) {
                showStatus(data.error, 'error');
                importBtn.disabled = false;
                importBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg><span>Import</span>';
                return;
            }

            currentFiles = data.newFiles || [];
            currentMode = 'import'; // Set mode to import

            if (currentFiles.length === 0) {
                showStatus('Aucun nouveau fichier à importer', 'warning');
                hideProgress();
            } else {
                displayFiles(currentFiles);
                document.getElementById('filesSection').classList.add('visible');
                document.getElementById('syncControls').classList.add('visible');
                showStatus(`${currentFiles.length} nouveau(x) fichier(s) détecté(s)`, 'success');
            }

            importBtn.disabled = false;
            importBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg><span>Import</span>';
            hideProgress();

        } catch (e) {
            showStatus('Erreur lors de l\'analyse: ' + e.message, 'error');
            importBtn.disabled = false;
            importBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg><span>Import</span>';
            hideProgress();
        }
    });
}

// Import selected files
function importSelected() {
    debugLog('Import manuel démarré', 'info');

    const selectedFiles = importFiles.filter((_, index) => {
        const checkbox = document.getElementById(`import-file-${index}`);
        return checkbox && checkbox.checked;
    });

    debugLog(`Fichiers sélectionnés: ${selectedFiles.length}`, 'info');

    if (selectedFiles.length === 0) {
        showStatus('Aucun fichier sélectionné', 'warning');
        debugLog('Aucun fichier sélectionné', 'warning');
        return;
    }

    // Check if auto-import is running
    debugLog(`Vérification verrou isImporting: ${isImporting}`, 'info');
    if (isImporting) {
        showStatus('Import automatique en cours, veuillez patienter...', 'warning');
        debugLog('Import bloqué - auto-import en cours', 'warning');
        return;
    }

    const importBtn = document.getElementById('importBtn');
    importBtn.disabled = true;

    // Set lock for manual import
    isImporting = true;
    debugLog('Verrou activé, isImporting = true', 'info');

    showProgress();
    updateProgress(0, 'Import en cours...');

    // Encode to base64 to avoid any escaping issues
    const filesToImport = JSON.stringify(selectedFiles);
    const base64Data = btoa(unescape(encodeURIComponent(filesToImport)));
    debugLog(`Appel ExtendScript avec ${selectedFiles.length} fichiers (base64)`, 'info');
    debugLog(`Taille base64: ${base64Data.length} caractères`, 'info');

    csInterface.evalScript(`FileManager_importFilesToProjectBase64('${base64Data}')`, (result) => {
        debugLog(`ExtendScript a répondu: ${result ? result.substring(0, 100) : 'null'}...`, 'info');

        try {
            const data = JSON.parse(result);

            if (data.error) {
                showStatus(data.error, 'error');
                importBtn.disabled = false;
                hideProgress();
                return;
            }

            // Extract results array from response
            const results = data.results || [];

            // Ensure results is an array
            if (!Array.isArray(results)) {
                console.error('Import did not return an array:', results);
                showStatus('Erreur: format de réponse invalide', 'error');
                importBtn.disabled = false;
                hideProgress();
                return;
            }

            const successCount = results.filter(r => r.success).length;
            showStatus(`${successCount} fichier(s) importé(s) avec succès`, 'success');

            importBtn.disabled = false;
            hideProgress();

            // Refresh analysis to update the list
            analyzeAll();

        } catch (e) {
            console.error('Import error:', e);
            showStatus('Erreur lors de l\'import: ' + e.message, 'error');
            importBtn.disabled = false;
            hideProgress();
        } finally {
            debugLog('Libération du verrou', 'info');
            isImporting = false;
        }
    });

    debugLog('Appel ExtendScript initié, en attente de réponse...', 'info');
}

// Auto-import functionality
function startAutoImport() {
    stopAutoImport(); // Clear any existing timer

    if (!settings.autoImport) return;

    const interval = (settings.autoImportInterval || 30) * 1000; // Convert to milliseconds

    autoImportTimer = setInterval(() => {
        // Prevent multiple simultaneous imports
        if (isImporting) {
            console.log('Auto-import: Previous import still in progress, skipping...');
            return;
        }

        // Set lock
        isImporting = true;

        try {
            const rootPath = (settings.rootFolder || '').replace(/\\/g, '\\\\');
            const levels = settings.rootFolderLevels || 0;
            const excludedFolders = JSON.stringify(settings.excludedFolders || []);
            const bannedExtensions = JSON.stringify(settings.bannedExtensions || []);
            const excludedFolderNames = JSON.stringify(settings.excludedFolderNames || []);

            const scanScript = `FileManager_scanForNewFiles("${rootPath}", '${excludedFolders}', '${bannedExtensions}', '${excludedFolderNames}', ${levels})`;

            csInterface.evalScript(scanScript, async (result) => {
                try {
                    const data = JSON.parse(result);

                    if (data.error) {
                        console.error('Auto-import scan error:', data.error);
                        isImporting = false;
                        return;
                    }

                    const newFiles = data.newFiles || [];

                    if (newFiles.length > 0) {
                        // Import new files
                        const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(newFiles))));

                        csInterface.evalScript(`FileManager_importFilesToProjectBase64('${base64Data}')`, (importResult) => {
                            try {
                                const importData = JSON.parse(importResult);

                                if (!importData.error) {
                                    const successCount = (importData.results || []).filter(r => r.success).length;
                                    console.log(`Auto-import: ${successCount} fichier(s) importé(s)`);
                                }
                            } catch (e) {
                                console.error('Auto-import error:', e);
                            } finally {
                                isImporting = false;
                            }
                        });
                    } else {
                        // No files to import, release lock immediately
                        isImporting = false;
                    }
                } catch (e) { // Catch for parsing scan result
                    console.error('Auto-import scan error (parsing result):', e);
                    isImporting = false;
                }
            });
        } catch (e) { // Catch for errors within the setInterval callback before evalScript returns
            console.error('Auto-import error:', e);
            isImporting = false;
        }
    }, interval);

    console.log(`Auto-import started with interval: ${settings.autoImportInterval}s`);
}

function stopAutoImport() {
    if (autoImportTimer) {
        clearInterval(autoImportTimer);
        autoImportTimer = null;
        console.log('Auto-import stopped');
    }
}

// Toggle auto-import from main UI
function toggleAutoImport() {
    settings.autoImport = !settings.autoImport;

    // Update the toggle buttons
    updateAutoImportButtons();

    // Start or stop auto-import immediately
    if (settings.autoImport) {
        startAutoImport();
        showStatus('Auto-import activé', 'success');
    } else {
        stopAutoImport();
        showStatus('Auto-import désactivé', 'info');
    }

    // Update the checkbox in settings
    const autoImportCheckbox = document.getElementById('autoImport');
    if (autoImportCheckbox) {
        autoImportCheckbox.checked = settings.autoImport;
    }

    // Save settings
    localStorage.setItem('fileManagerSettings', JSON.stringify(settings));
}

// Update auto-import toggle button states
function updateAutoImportButtons() {
    const mainToggle = document.getElementById('autoImportToggle');
    const compactToggle = document.getElementById('compactAutoToggle');

    // Update header button
    if (mainToggle) {
        const spanElement = mainToggle.querySelector('span');
        if (settings.autoImport) {
            mainToggle.classList.add('active');
            if (spanElement) spanElement.textContent = 'Auto: ON';
        } else {
            mainToggle.classList.remove('active');
            if (spanElement) spanElement.textContent = 'Auto: OFF';
        }
    }

    // Update compact button
    if (compactToggle) {
        const spanElement = compactToggle.querySelector('span');
        if (settings.autoImport) {
            compactToggle.classList.add('active');
            if (spanElement) spanElement.textContent = 'Auto: ON';
        } else {
            compactToggle.classList.remove('active');
            if (spanElement) spanElement.textContent = 'Auto: OFF';
        }
    }
}

// Toggle debug section visibility
function toggleDebugSection() {
    const debugContent = document.getElementById('debugContent');
    const debugToggleIcon = document.getElementById('debugToggleIcon');

    if (debugContent.style.display === 'none') {
        debugContent.style.display = 'block';
        debugToggleIcon.textContent = '▲';
        debugToggleIcon.style.transform = 'rotate(180deg)';
    } else {
        debugContent.style.display = 'none';
        debugToggleIcon.textContent = '▼';
        debugToggleIcon.style.transform = 'rotate(0deg)';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    getProjectInfo();

    // Connect fileOperations.js logging to the UI debug panel
    if (typeof fm_setLogCallback === 'function') {
        fm_setLogCallback((message, level) => {
            debugLog(message, level);
        });
        debugLog('File operations logging connected', 'info');
    }

    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('browseRootBtn').addEventListener('click', browseRootFolder);

    document.getElementById('analyzeBtn').addEventListener('click', analyzeAll);

    // Import column controls
    document.getElementById('selectAllImportBtn').addEventListener('click', selectAllImport);
    document.getElementById('deselectAllImportBtn').addEventListener('click', deselectAllImport);
    document.getElementById('importBtn').addEventListener('click', importSelected);

    // Export column controls
    document.getElementById('selectAllExportBtn').addEventListener('click', selectAllExport);
    document.getElementById('deselectAllExportBtn').addEventListener('click', deselectAllExport);
    document.getElementById('exportBtn').addEventListener('click', exportSelected);

    // Compact mode
    document.getElementById('compactImportBtn').addEventListener('click', compactImport);
    document.getElementById('compactExportBtn').addEventListener('click', compactExport);

    // Debug
    document.getElementById('clearLogsBtn').addEventListener('click', clearDebugLogs);

    // Language change function
    function changeLanguage(newLang) {
        currentLang = newLang;
        settings.language = newLang;
        localStorage.setItem('fileManagerSettings', JSON.stringify(settings));

        // Sync both language selectors
        const langSelect = document.getElementById('languageSelect');
        const headerLangSelect = document.getElementById('headerLanguageSelect');
        if (langSelect) langSelect.value = newLang;
        if (headerLangSelect) headerLangSelect.value = newLang;

        updateUILanguage();
    }

    // Instant language change from settings
    document.getElementById('languageSelect').addEventListener('change', function () {
        changeLanguage(this.value);
    });

    // Instant language change from header
    document.getElementById('headerLanguageSelect').addEventListener('change', function () {
        changeLanguage(this.value);
    });

    // Initialize auto-import toggle buttons state
    updateAutoImportButtons();

    // Initialize auto-import if enabled
    if (settings.autoImport) {
        startAutoImport();
    }

    // Check for updates
    checkForUpdates();
});

// ============================================================================
// UPDATE SYSTEM
// ============================================================================

/**
 * Compare two version strings (e.g. "1.0.0" vs "1.0.1")
 */
function compareVersions(v1, v2) {
    const p1 = v1.replace(/^v/, '').split('.').map(Number);
    const p2 = v2.replace(/^v/, '').split('.').map(Number);
    const len = Math.max(p1.length, p2.length);

    for (let i = 0; i < len; i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    return 0;
}

/**
 * Get current version from manifest
 */
function getAppVersion() {
    try {
        if (window.cep && window.cep.fs) {
            const path = window.cep.fs.readFile(csInterface.getSystemPath(SystemPath.EXTENSION) + "/CSXS/manifest.xml");
            if (path.data) {
                const match = path.data.match(/ExtensionBundleVersion="([^"]+)"/);
                if (match && match[1]) {
                    return match[1];
                }
            }
        }
    } catch (e) {
        console.error('[Update] Error reading manifest:', e);
    }
    return CURRENT_VERSION;
}

/**
 * Check for updates on GitHub
 */
async function checkForUpdates() {
    console.log('[Update] Checking for updates...');
    const localVersion = getAppVersion();
    console.log('[Update] Local version:', localVersion);

    // Update settings badge
    const versionBadge = document.getElementById('versionInfo');
    if (versionBadge) {
        versionBadge.textContent = 'v' + localVersion;
    }

    try {
        if (window.require) {
            const https = require('https');
            const options = {
                hostname: 'api.github.com',
                path: `/repos/${GITHUB_REPO}/releases/latest`,
                method: 'GET',
                headers: {
                    'User-Agent': 'PremiereCommon-UpdateCheck'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    handleUpdateResponse(data, localVersion);
                });
            });

            req.on('error', (e) => {
                console.error('[Update] Network error:', e);
            });

            req.end();
        } else {
            // Fallback to fetch
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            if (response.ok) {
                const data = await response.text();
                handleUpdateResponse(data, localVersion);
            }
        }

    } catch (e) {
        console.error('[Update] Unexpected error:', e);
    }
}

function handleUpdateResponse(data, localVersion) {
    try {
        const release = JSON.parse(data);
        const latestVersion = release.tag_name.replace(/^v/, '');

        console.log('[Update] Latest version:', latestVersion);

        if (compareVersions(latestVersion, localVersion) > 0) {
            console.log('[Update] New version available!');

            // Find zip asset
            const zipAsset = release.assets.find(asset => asset.name.endsWith('.zip'));
            const downloadUrl = zipAsset ? zipAsset.browser_download_url : release.html_url;

            showUpdateBanner(downloadUrl);
        } else {
            console.log('[Update] App is up to date.');
        }
    } catch (e) {
        console.error('[Update] Error parsing response:', e);
    }
}

/**
 * Show update banner
 */
function showUpdateBanner(downloadUrl) {
    const banner = document.getElementById('updateBanner');
    if (banner) {
        banner.style.display = 'block';

        // Use translation function
        banner.textContent = t('status.updateAvailable');

        banner.onclick = function () {
            if (downloadUrl) {
                try {
                    csInterface.openURLInDefaultBrowser(downloadUrl);
                } catch (e) {
                    console.error('[Update] Error opening URL:', e);
                    try {
                        window.location.href = downloadUrl;
                    } catch (e2) {
                        console.error('[Update] Fallback failed:', e2);
                    }
                }
            }
        };
    }
}
