// Main JavaScript for File Manager Extension

const csInterface = new CSInterface();
let currentFiles = [];
let settings = {
    rootFolder: '',
    autoRelink: true
};

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('fileManagerSettings');
    if (saved) {
        settings = JSON.parse(saved);
        document.getElementById('rootFolder').value = settings.rootFolder || '';
        document.getElementById('autoRelink').checked = settings.autoRelink !== false;
    }
}

// Save settings to localStorage
function saveSettings() {
    settings.rootFolder = document.getElementById('rootFolder').value;
    settings.autoRelink = document.getElementById('autoRelink').checked;
    localStorage.setItem('fileManagerSettings', JSON.stringify(settings));
    showStatus('Paramètres enregistrés', 'success');
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

// Update progress
function updateProgress(percent, text) {
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');

    progressContainer.classList.add('visible');
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
    progressPercent.textContent = percent + '%';
}

// Hide progress
function hideProgress() {
    document.getElementById('progressContainer').classList.remove('visible');
}

// Get project info
function getProjectInfo() {
    csInterface.evalScript('getProjectInfo()', (result) => {
        try {
            const info = JSON.parse(result);

            if (info.error) {
                showStatus('Erreur: ' + info.error, 'error');
                return;
            }

            document.getElementById('projectName').textContent = info.name || 'Sans nom';
            document.getElementById('projectRoot').textContent = info.rootPath || 'Non défini';

        } catch (e) {
            showStatus('Erreur lors de la récupération des informations du projet', 'error');
        }
    });
}

// Analyze project
function analyzeProject() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span>Analyse en cours...</span>';

    updateProgress(0, 'Analyse du projet...');

    const rootPath = settings.rootFolder || '';
    const scriptCall = rootPath ? `getFilesToSync("${rootPath}")` : 'getFilesToSync()';

    csInterface.evalScript(scriptCall, (result) => {
        try {
            const data = JSON.parse(result);

            if (data.error) {
                showStatus('Erreur: ' + data.error, 'error');
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Analyser le projet</span>';
                hideProgress();
                return;
            }

            currentFiles = data.filesToSync || [];
            displayFiles(currentFiles);

            updateProgress(100, 'Analyse terminée');
            setTimeout(hideProgress, 1000);

            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Analyser le projet</span>';

            if (currentFiles.length === 0) {
                showStatus('Aucun fichier externe trouvé. Tous les fichiers sont déjà dans le projet.', 'success');
            } else {
                showStatus(`${currentFiles.length} fichier(s) externe(s) trouvé(s)`, 'warning');
            }

        } catch (e) {
            showStatus('Erreur lors de l\'analyse: ' + e.message, 'error');
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Analyser le projet</span>';
            hideProgress();
        }
    });
}

// Display files in list
function displayFiles(files) {
    const filesList = document.getElementById('filesList');
    const filesSection = document.getElementById('filesSection');
    const syncControls = document.getElementById('syncControls');

    filesSection.classList.add('visible');

    if (files.length === 0) {
        filesList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Tous les fichiers sont déjà synchronisés !</p>
            </div>
        `;
        syncControls.classList.remove('visible');
        return;
    }

    filesList.innerHTML = '';

    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <input type="checkbox" id="file-${index}" checked data-index="${index}">
            <div class="file-details">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-bin">📁 ${escapeHtml(file.binPath || 'Racine')}</div>
                <div class="file-path">Actuel: ${escapeHtml(file.currentPath)}</div>
            </div>
        `;
        filesList.appendChild(fileItem);
    });

    syncControls.classList.add('visible');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Select all files
function selectAll() {
    document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
}

// Deselect all files
function deselectAll() {
    document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
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
                    csInterface.evalScript(`batchRelinkMedia('${JSON.stringify(relinkList)}')`, (result) => {
                        resolve();
                    });
                });
            }
        }

        // Display report
        displayReport(results);

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

// Display synchronization report
function displayReport(results) {
    const reportSection = document.getElementById('reportSection');
    const reportContent = document.getElementById('reportContent');

    reportSection.classList.add('visible');
    reportContent.innerHTML = '';

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'report-item ' + (result.success ? 'success' : 'error');

        const icon = result.success
            ? '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

        let message = result.name;
        if (result.skipped) {
            message += ' (déjà existant)';
        } else if (result.error) {
            message += ' - ' + result.error;
        }

        item.innerHTML = icon + '<span>' + escapeHtml(message) + '</span>';
        reportContent.appendChild(item);
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
    csInterface.evalScript('selectFolder()', (result) => {
        if (result && result !== 'null') {
            document.getElementById('rootFolder').value = result;
        }
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    getProjectInfo();

    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('browseRootBtn').addEventListener('click', browseRootFolder);

    document.getElementById('analyzeBtn').addEventListener('click', analyzeProject);
    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
    document.getElementById('syncBtn').addEventListener('click', synchronizeFiles);
});
