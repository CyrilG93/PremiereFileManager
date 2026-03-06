// Main JavaScript for File Manager Extension

const csInterface = new CSInterface();
let currentFiles = [];
let currentMode = 'export'; // Track current mode: 'export' or 'import'

const GITHUB_REPO = 'CyrilG93/PremiereFileManager';
let CURRENT_VERSION = '1.3.0';

// Deep-merge helper to build locale packs from a shared base dictionary
function fm_mergeTranslations(base, overrides) {
    const result = Array.isArray(base) ? base.slice() : { ...base };
    if (!overrides || typeof overrides !== 'object') {
        return result;
    }

    Object.keys(overrides).forEach((key) => {
        const overrideValue = overrides[key];
        if (overrideValue && typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
            const baseValue = base && typeof base[key] === 'object' ? base[key] : {};
            result[key] = fm_mergeTranslations(baseValue, overrideValue);
        } else {
            result[key] = overrideValue;
        }
    });

    return result;
}

// Embedded translations (no async loading to avoid initialization issues)
const baseTranslations = {
    settings: {
        title: "Settings",
        language: "Language",
        hostLogLevel: "Host log level",
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
};

const translations = {
    en: baseTranslations,
    de: fm_mergeTranslations(baseTranslations, {
        settings: {
            title: "Einstellungen",
            language: "Sprache",
            rootFolder: "Projekt-Stammordner",
            rootFolderPlaceholder: "Automatisch erkennen",
            rootFolderLevels: "Übergeordnete Ebenen ab Projektdatei",
            rootFolderLevelsHelp: "Wie viele Ebenen oberhalb des Projektdatei-Ordners verwendet werden (0 = gleicher Ordner, 1 = Elternordner, 2 = Großelternordner)",
            autoRelink: "Medien nach Konsolidierung automatisch neu verknüpfen",
            autoImport: "Automatischer Import",
            autoImportInterval: "Intervall für automatischen Import (Sekunden)",
            excludedFolders: "Von der Konsolidierung ausgeschlossene Ordner",
            excludedFoldersPlaceholder: "Bsp: TEMP, CACHE, BACKUP\nEin Ordner pro Zeile",
            excludedFolderNames: "Beim Import zu ignorierende Ordnernamen",
            excludedFolderNamesPlaceholder: "Bsp: node_modules, .git, Thumbs.db",
            bannedExtensions: "Vom Import ausgeschlossene Dateiendungen",
            bannedExtensionsPlaceholder: "Bsp: .zip, .pptx, .exe\nEine Endung pro Zeile"
        },
        buttons: {
            analyze: "Analysieren",
            import: "Importieren",
            export: "Konsolidieren",
            selectAll: "Alle",
            deselectAll: "Keine",
            save: "Speichern",
            selectAllImport: "Alle",
            deselectAllImport: "Keine",
            selectAllExport: "Alle",
            deselectAllExport: "Keine"
        },
        compact: {
            import: "Importieren",
            export: "Konsolidieren"
        },
        labels: {
            project: "Projekt:",
            rootFolder: "Stammordner:",
            current: "Aktuell:",
            target: "Ziel:",
            bin: "Bin:",
            binDefault: "Stamm",
            offline: "offline"
        },
        results: {
            importTitle: "Dateien zum Import",
            exportTitle: "Dateien zur Konsolidierung",
            emptyImport: "Keine neuen Dateien zum Import",
            emptyExport: "Alle Dateien sind konsolidiert",
            importSubtitle: "Aus Ordner → Premiere Pro",
            exportSubtitle: "Von Premiere Pro → Ordner",
            importButton: "Importieren",
            exportButton: "Konsolidieren"
        },
        report: {
            title: "Konsolidierungsbericht",
            success: "Erfolg",
            skipped: "Übersprungen (bereits vorhanden)",
            failed: "Fehlgeschlagen"
        },
        status: {
            analyzing: "Projekt wird analysiert...",
            searching: "Suche nach neuen Dateien...",
            importing: "Dateien werden importiert...",
            exporting: "Dateien werden konsolidiert...",
            relinking: "Medien werden neu verknüpft...",
            completed: "Vorgang abgeschlossen",
            saved: "Einstellungen gespeichert",
            noNewFiles: "Keine neuen Dateien zum Import",
            allSynced: "Alle Dateien sind konsolidiert",
            filesDetected: "Datei(en) erkannt",
            newFilesDetected: "neue Datei(en) erkannt",
            filesImported: "Datei(en) erfolgreich importiert",
            filesExported: "Datei(en) erfolgreich konsolidiert",
            autoImportStarted: "Automatischer Import gestartet mit Intervall",
            autoImportStopped: "Automatischer Import gestoppt",
            selectFolder: "Bitte zuerst einen Stammordner auswählen",
            toImport: "zum Import",
            toExport: "zur Konsolidierung",
            noFilesToSync: "Keine Dateien zum Synchronisieren",
            updateAvailable: "🚀 Neue Version verfügbar! Zum Aktualisieren klicken."
        }
    }),
    es: fm_mergeTranslations(baseTranslations, {
        settings: {
            title: "Configuración",
            language: "Idioma",
            rootFolder: "Carpeta raíz del proyecto",
            rootFolderPlaceholder: "Detección automática",
            rootFolderLevels: "Niveles superiores desde el archivo de proyecto",
            rootFolderLevelsHelp: "Cuántos niveles subir desde la carpeta del archivo del proyecto (0 = misma carpeta, 1 = carpeta padre, 2 = carpeta abuelo)",
            autoRelink: "Volver a enlazar medios automáticamente tras la consolidación",
            autoImport: "Importación automática",
            autoImportInterval: "Intervalo de importación automática (segundos)",
            excludedFolders: "Carpetas excluidas de la consolidación",
            excludedFoldersPlaceholder: "Ej: TEMP, CACHE, BACKUP\nUna carpeta por línea",
            excludedFolderNames: "Nombres de carpetas a ignorar en importación",
            excludedFolderNamesPlaceholder: "Ej: node_modules, .git, Thumbs.db",
            bannedExtensions: "Extensiones de archivo prohibidas para importar",
            bannedExtensionsPlaceholder: "Ej: .zip, .pptx, .exe\nUna extensión por línea"
        },
        buttons: {
            analyze: "Analizar",
            import: "Importar",
            export: "Consolidar",
            selectAll: "Todo",
            deselectAll: "Ninguno",
            save: "Guardar",
            selectAllImport: "Todo",
            deselectAllImport: "Ninguno",
            selectAllExport: "Todo",
            deselectAllExport: "Ninguno"
        },
        compact: {
            import: "Importar",
            export: "Consolidar"
        },
        labels: {
            project: "Proyecto:",
            rootFolder: "Carpeta raíz:",
            current: "Actual:",
            target: "Destino:",
            bin: "Bin:",
            binDefault: "Raíz",
            offline: "sin conexión"
        },
        results: {
            importTitle: "Archivos para importar",
            exportTitle: "Archivos para consolidar",
            emptyImport: "No hay archivos nuevos para importar",
            emptyExport: "Todos los archivos están consolidados",
            importSubtitle: "De carpeta → Premiere Pro",
            exportSubtitle: "De Premiere Pro → carpeta",
            importButton: "Importar",
            exportButton: "Consolidar"
        },
        report: {
            title: "Informe de consolidación",
            success: "Éxito",
            skipped: "Omitido (ya existe)",
            failed: "Error"
        },
        status: {
            analyzing: "Analizando proyecto...",
            searching: "Buscando archivos nuevos...",
            importing: "Importando archivos...",
            exporting: "Consolidando archivos...",
            relinking: "Volviendo a enlazar medios...",
            completed: "Operación completada",
            saved: "Configuración guardada",
            noNewFiles: "No hay archivos nuevos para importar",
            allSynced: "Todos los archivos están consolidados",
            filesDetected: "archivo(s) detectado(s)",
            newFilesDetected: "archivo(s) nuevo(s) detectado(s)",
            filesImported: "archivo(s) importado(s) correctamente",
            filesExported: "archivo(s) consolidado(s) correctamente",
            autoImportStarted: "Importación automática iniciada con intervalo",
            autoImportStopped: "Importación automática detenida",
            selectFolder: "Primero selecciona una carpeta raíz",
            toImport: "para importar",
            toExport: "para consolidar",
            noFilesToSync: "No hay archivos para sincronizar",
            updateAvailable: "🚀 ¡Nueva versión disponible! Haz clic para actualizar."
        }
    }),
    fr: fm_mergeTranslations(baseTranslations, {
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
    }),
    it: fm_mergeTranslations(baseTranslations, {
        settings: {
            title: "Impostazioni",
            language: "Lingua",
            rootFolder: "Cartella radice del progetto",
            rootFolderPlaceholder: "Rilevamento automatico",
            rootFolderLevels: "Livelli superiori dal file di progetto",
            rootFolderLevelsHelp: "Di quanti livelli risalire dalla cartella del file progetto (0 = stessa cartella, 1 = cartella padre, 2 = cartella nonno)",
            autoRelink: "Ricollega automaticamente i media dopo la consolidazione",
            autoImport: "Importazione automatica",
            autoImportInterval: "Intervallo importazione automatica (secondi)",
            excludedFolders: "Cartelle escluse dalla consolidazione",
            excludedFoldersPlaceholder: "Es: TEMP, CACHE, BACKUP\nUna cartella per riga",
            excludedFolderNames: "Nomi cartelle da ignorare in importazione",
            excludedFolderNamesPlaceholder: "Es: node_modules, .git, Thumbs.db",
            bannedExtensions: "Estensioni file vietate in importazione",
            bannedExtensionsPlaceholder: "Es: .zip, .pptx, .exe\nUna estensione per riga"
        },
        buttons: {
            analyze: "Analizza",
            import: "Importa",
            export: "Consolida",
            selectAll: "Tutto",
            deselectAll: "Nessuno",
            save: "Salva",
            selectAllImport: "Tutto",
            deselectAllImport: "Nessuno",
            selectAllExport: "Tutto",
            deselectAllExport: "Nessuno"
        },
        compact: {
            import: "Importa",
            export: "Consolida"
        },
        labels: {
            project: "Progetto:",
            rootFolder: "Cartella radice:",
            current: "Attuale:",
            target: "Destinazione:",
            bin: "Bin:",
            binDefault: "Radice",
            offline: "offline"
        },
        results: {
            importTitle: "File da importare",
            exportTitle: "File da consolidare",
            emptyImport: "Nessun nuovo file da importare",
            emptyExport: "Tutti i file sono consolidati",
            importSubtitle: "Da cartella → Premiere Pro",
            exportSubtitle: "Da Premiere Pro → cartella",
            importButton: "Importa",
            exportButton: "Consolida"
        },
        report: {
            title: "Report di consolidazione",
            success: "Successo",
            skipped: "Saltato (già esiste)",
            failed: "Errore"
        },
        status: {
            analyzing: "Analisi del progetto...",
            searching: "Ricerca di nuovi file...",
            importing: "Importazione file...",
            exporting: "Consolidamento file...",
            relinking: "Ricollegamento media...",
            completed: "Operazione completata",
            saved: "Impostazioni salvate",
            noNewFiles: "Nessun nuovo file da importare",
            allSynced: "Tutti i file sono consolidati",
            filesDetected: "file rilevato/i",
            newFilesDetected: "nuovo/i file rilevato/i",
            filesImported: "file importato/i con successo",
            filesExported: "file consolidato/i con successo",
            autoImportStarted: "Importazione automatica avviata con intervallo",
            autoImportStopped: "Importazione automatica arrestata",
            selectFolder: "Seleziona prima una cartella radice",
            toImport: "da importare",
            toExport: "da consolidare",
            noFilesToSync: "Nessun file da sincronizzare",
            updateAvailable: "🚀 Nuova versione disponibile! Clicca per aggiornare."
        }
    }),
    'pt-BR': fm_mergeTranslations(baseTranslations, {
        settings: {
            title: "Configurações",
            language: "Idioma",
            rootFolder: "Pasta raiz do projeto",
            rootFolderPlaceholder: "Detecção automática",
            rootFolderLevels: "Níveis acima do arquivo de projeto",
            rootFolderLevelsHelp: "Quantos níveis subir a partir da pasta do arquivo de projeto (0 = mesma pasta, 1 = pasta pai, 2 = pasta avô)",
            autoRelink: "Religar mídia automaticamente após consolidação",
            autoImport: "Importação automática",
            autoImportInterval: "Intervalo da importação automática (segundos)",
            excludedFolders: "Pastas excluídas da consolidação",
            excludedFoldersPlaceholder: "Ex: TEMP, CACHE, BACKUP\nUma pasta por linha",
            excludedFolderNames: "Nomes de pastas para ignorar na importação",
            excludedFolderNamesPlaceholder: "Ex: node_modules, .git, Thumbs.db",
            bannedExtensions: "Extensões de arquivo proibidas na importação",
            bannedExtensionsPlaceholder: "Ex: .zip, .pptx, .exe\nUma extensão por linha"
        },
        buttons: {
            analyze: "Analisar",
            import: "Importar",
            export: "Consolidar",
            selectAll: "Tudo",
            deselectAll: "Nenhum",
            save: "Salvar",
            selectAllImport: "Tudo",
            deselectAllImport: "Nenhum",
            selectAllExport: "Tudo",
            deselectAllExport: "Nenhum"
        },
        compact: {
            import: "Importar",
            export: "Consolidar"
        },
        labels: {
            project: "Projeto:",
            rootFolder: "Pasta raiz:",
            current: "Atual:",
            target: "Destino:",
            bin: "Bin:",
            binDefault: "Raiz",
            offline: "offline"
        },
        results: {
            importTitle: "Arquivos para importar",
            exportTitle: "Arquivos para consolidar",
            emptyImport: "Nenhum arquivo novo para importar",
            emptyExport: "Todos os arquivos estão consolidados",
            importSubtitle: "Da pasta → Premiere Pro",
            exportSubtitle: "Do Premiere Pro → pasta",
            importButton: "Importar",
            exportButton: "Consolidar"
        },
        report: {
            title: "Relatório de consolidação",
            success: "Sucesso",
            skipped: "Ignorado (já existe)",
            failed: "Falha"
        },
        status: {
            analyzing: "Analisando projeto...",
            searching: "Procurando novos arquivos...",
            importing: "Importando arquivos...",
            exporting: "Consolidando arquivos...",
            relinking: "Religando mídia...",
            completed: "Operação concluída",
            saved: "Configurações salvas",
            noNewFiles: "Nenhum arquivo novo para importar",
            allSynced: "Todos os arquivos estão consolidados",
            filesDetected: "arquivo(s) detectado(s)",
            newFilesDetected: "novo(s) arquivo(s) detectado(s)",
            filesImported: "arquivo(s) importado(s) com sucesso",
            filesExported: "arquivo(s) consolidado(s) com sucesso",
            autoImportStarted: "Importação automática iniciada com intervalo",
            autoImportStopped: "Importação automática parada",
            selectFolder: "Selecione uma pasta raiz primeiro",
            toImport: "para importar",
            toExport: "para consolidar",
            noFilesToSync: "Nenhum arquivo para sincronizar",
            updateAvailable: "🚀 Nova versão disponível! Clique para atualizar."
        }
    }),
    ru: fm_mergeTranslations(baseTranslations, {
        settings: {
            title: "Настройки",
            language: "Язык",
            rootFolder: "Корневая папка проекта",
            rootFolderPlaceholder: "Автоопределение",
            rootFolderLevels: "Уровни выше файла проекта",
            rootFolderLevelsHelp: "На сколько уровней подняться от папки файла проекта (0 = та же папка, 1 = родительская, 2 = на уровень выше)",
            autoRelink: "Автоперепривязка медиа после консолидации",
            autoImport: "Автоимпорт",
            autoImportInterval: "Интервал автоимпорта (секунды)",
            excludedFolders: "Папки, исключённые из консолидации",
            excludedFoldersPlaceholder: "Пример: TEMP, CACHE, BACKUP\nОдна папка на строку",
            excludedFolderNames: "Имена папок, игнорируемые при импорте",
            excludedFolderNamesPlaceholder: "Пример: node_modules, .git, Thumbs.db",
            bannedExtensions: "Расширения файлов, запрещённые для импорта",
            bannedExtensionsPlaceholder: "Пример: .zip, .pptx, .exe\nОдно расширение на строку"
        },
        buttons: {
            analyze: "Анализ",
            import: "Импорт",
            export: "Консолидация",
            selectAll: "Все",
            deselectAll: "Ничего",
            save: "Сохранить",
            selectAllImport: "Все",
            deselectAllImport: "Ничего",
            selectAllExport: "Все",
            deselectAllExport: "Ничего"
        },
        compact: {
            import: "Импорт",
            export: "Консолидация"
        },
        labels: {
            project: "Проект:",
            rootFolder: "Корневая папка:",
            current: "Текущий:",
            target: "Цель:",
            bin: "Бин:",
            binDefault: "Корень",
            offline: "не в сети"
        },
        results: {
            importTitle: "Файлы для импорта",
            exportTitle: "Файлы для консолидации",
            emptyImport: "Нет новых файлов для импорта",
            emptyExport: "Все файлы консолидированы",
            importSubtitle: "Из папки → Premiere Pro",
            exportSubtitle: "Из Premiere Pro → в папку",
            importButton: "Импорт",
            exportButton: "Консолидация"
        },
        report: {
            title: "Отчёт о консолидации",
            success: "Успех",
            skipped: "Пропущено (уже существует)",
            failed: "Ошибка"
        },
        status: {
            analyzing: "Анализ проекта...",
            searching: "Поиск новых файлов...",
            importing: "Импорт файлов...",
            exporting: "Консолидация файлов...",
            relinking: "Перепривязка медиа...",
            completed: "Операция завершена",
            saved: "Настройки сохранены",
            noNewFiles: "Нет новых файлов для импорта",
            allSynced: "Все файлы консолидированы",
            filesDetected: "файл(ов) обнаружено",
            newFilesDetected: "новых файл(ов) обнаружено",
            filesImported: "файл(ов) успешно импортировано",
            filesExported: "файл(ов) успешно консолидировано",
            autoImportStarted: "Автоимпорт запущен с интервалом",
            autoImportStopped: "Автоимпорт остановлен",
            selectFolder: "Сначала выберите корневую папку",
            toImport: "к импорту",
            toExport: "к консолидации",
            noFilesToSync: "Нет файлов для синхронизации",
            updateAvailable: "🚀 Доступна новая версия! Нажмите для обновления."
        }
    }),
    ja: fm_mergeTranslations(baseTranslations, {
        settings: {
            title: "設定",
            language: "言語",
            rootFolder: "プロジェクトのルートフォルダー",
            rootFolderPlaceholder: "自動検出",
            rootFolderLevels: "プロジェクトファイルからの親階層数",
            rootFolderLevelsHelp: "プロジェクトファイルのフォルダーから何階層上を使うか (0 = 同じフォルダー, 1 = 親, 2 = 祖父母)",
            autoRelink: "統合後にメディアを自動再リンク",
            autoImport: "自動インポート",
            autoImportInterval: "自動インポート間隔 (秒)",
            excludedFolders: "統合から除外するフォルダー",
            excludedFoldersPlaceholder: "例: TEMP, CACHE, BACKUP\n1行に1フォルダー",
            excludedFolderNames: "インポート時に無視するフォルダー名",
            excludedFolderNamesPlaceholder: "例: node_modules, .git, Thumbs.db",
            bannedExtensions: "インポート禁止の拡張子",
            bannedExtensionsPlaceholder: "例: .zip, .pptx, .exe\n1行に1拡張子"
        },
        buttons: {
            analyze: "解析",
            import: "インポート",
            export: "統合",
            selectAll: "全て",
            deselectAll: "なし",
            save: "保存",
            selectAllImport: "全て",
            deselectAllImport: "なし",
            selectAllExport: "全て",
            deselectAllExport: "なし"
        },
        compact: {
            import: "インポート",
            export: "統合"
        },
        labels: {
            project: "プロジェクト:",
            rootFolder: "ルートフォルダー:",
            current: "現在:",
            target: "保存先:",
            bin: "ビン:",
            binDefault: "ルート",
            offline: "オフライン"
        },
        results: {
            importTitle: "インポートするファイル",
            exportTitle: "統合するファイル",
            emptyImport: "インポートする新しいファイルはありません",
            emptyExport: "すべてのファイルが統合済みです",
            importSubtitle: "フォルダー → Premiere Pro",
            exportSubtitle: "Premiere Pro → フォルダー",
            importButton: "インポート",
            exportButton: "統合"
        },
        report: {
            title: "統合レポート",
            success: "成功",
            skipped: "スキップ (既に存在)",
            failed: "失敗"
        },
        status: {
            analyzing: "プロジェクトを解析中...",
            searching: "新しいファイルを検索中...",
            importing: "ファイルをインポート中...",
            exporting: "ファイルを統合中...",
            relinking: "メディアを再リンク中...",
            completed: "操作が完了しました",
            saved: "設定を保存しました",
            noNewFiles: "インポートする新しいファイルはありません",
            allSynced: "すべてのファイルが統合済みです",
            filesDetected: "件のファイルを検出",
            newFilesDetected: "件の新規ファイルを検出",
            filesImported: "件のファイルを正常にインポート",
            filesExported: "件のファイルを正常に統合",
            autoImportStarted: "自動インポートを次の間隔で開始",
            autoImportStopped: "自動インポートを停止",
            selectFolder: "先にルートフォルダーを選択してください",
            toImport: "インポート対象",
            toExport: "統合対象",
            noFilesToSync: "同期するファイルはありません",
            updateAvailable: "🚀 新しいバージョンがあります。クリックして更新してください。"
        }
    }),
    'zh-CN': fm_mergeTranslations(baseTranslations, {
        settings: {
            title: "设置",
            language: "语言",
            rootFolder: "项目根文件夹",
            rootFolderPlaceholder: "自动检测",
            rootFolderLevels: "从项目文件向上的层级",
            rootFolderLevelsHelp: "从项目文件所在文件夹向上几级 (0 = 同级文件夹, 1 = 上一级, 2 = 上两级)",
            autoRelink: "整合后自动重新链接媒体",
            autoImport: "自动导入",
            autoImportInterval: "自动导入间隔 (秒)",
            excludedFolders: "从整合中排除的文件夹",
            excludedFoldersPlaceholder: "例如: TEMP, CACHE, BACKUP\n每行一个文件夹",
            excludedFolderNames: "导入时忽略的文件夹名称",
            excludedFolderNamesPlaceholder: "例如: node_modules, .git, Thumbs.db",
            bannedExtensions: "禁止导入的文件扩展名",
            bannedExtensionsPlaceholder: "例如: .zip, .pptx, .exe\n每行一个扩展名"
        },
        buttons: {
            analyze: "分析",
            import: "导入",
            export: "整合",
            selectAll: "全部",
            deselectAll: "无",
            save: "保存",
            selectAllImport: "全部",
            deselectAllImport: "无",
            selectAllExport: "全部",
            deselectAllExport: "无"
        },
        compact: {
            import: "导入",
            export: "整合"
        },
        labels: {
            project: "项目:",
            rootFolder: "根文件夹:",
            current: "当前:",
            target: "目标:",
            bin: "素材箱:",
            binDefault: "根目录",
            offline: "离线"
        },
        results: {
            importTitle: "待导入文件",
            exportTitle: "待整合文件",
            emptyImport: "没有可导入的新文件",
            emptyExport: "所有文件都已整合",
            importSubtitle: "文件夹 → Premiere Pro",
            exportSubtitle: "Premiere Pro → 文件夹",
            importButton: "导入",
            exportButton: "整合"
        },
        report: {
            title: "整合报告",
            success: "成功",
            skipped: "已跳过 (已存在)",
            failed: "失败"
        },
        status: {
            analyzing: "正在分析项目...",
            searching: "正在查找新文件...",
            importing: "正在导入文件...",
            exporting: "正在整合文件...",
            relinking: "正在重新链接媒体...",
            completed: "操作已完成",
            saved: "设置已保存",
            noNewFiles: "没有可导入的新文件",
            allSynced: "所有文件都已整合",
            filesDetected: "个文件已检测",
            newFilesDetected: "个新文件已检测",
            filesImported: "个文件导入成功",
            filesExported: "个文件整合成功",
            autoImportStarted: "已按间隔启动自动导入",
            autoImportStopped: "已停止自动导入",
            selectFolder: "请先选择根文件夹",
            toImport: "待导入",
            toExport: "待整合",
            noFilesToSync: "没有可同步的文件",
            updateAvailable: "🚀 有新版本可用！点击更新。"
        }
    })
};

let currentLang = 'en'; // Default language

// Resolve a dotted translation key for a specific language
function resolveTranslation(lang, key) {
    const keys = key.split('.');
    let value = translations[lang];

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return null;
        }
    }

    return value;
}

// Translation function
function t(key) {
    const langValue = resolveTranslation(currentLang, key);
    if (langValue !== null && langValue !== undefined) {
        return langValue;
    }

    // Fallback to English when a key is missing in the selected language
    const fallbackValue = resolveTranslation('en', key);
    return fallbackValue !== null && fallbackValue !== undefined ? fallbackValue : key;
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
        fm_writeSettingsToFileDebounced(settings);
        localStorage.setItem('fileManagerSettings', JSON.stringify(settings));

        // Keep both selectors aligned when language changes from either location
        const langSelect = document.getElementById('languageSelect');
        const headerLangSelect = document.getElementById('headerLanguageSelect');
        if (langSelect) langSelect.value = lang;
        if (headerLangSelect) headerLangSelect.value = lang;
    }
}

// Normalize extension list for reliable merge between defaults and user custom values
function fm_normalizeExtensionList(extensions) {
    if (!Array.isArray(extensions)) {
        return [];
    }

    const normalizedSet = new Set();

    extensions.forEach((ext) => {
        if (typeof ext !== 'string') {
            return;
        }

        const trimmed = ext.trim().toLowerCase();
        if (trimmed === '') {
            return;
        }

        const withDot = trimmed.startsWith('.') ? trimmed : ('.' + trimmed);
        normalizedSet.add(withDot);
    });

    return Array.from(normalizedSet).sort();
}

// Default banned extensions merged with user settings on update
const FM_DEFAULT_BANNED_EXTENSIONS = fm_normalizeExtensionList([
    // Archives
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
    // Documents/Data
    '.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.pdf', '.txt', '.rtf', '.odt',
    // Executables
    '.exe', '.app', '.dmg', '.msi', '.bat', '.sh', '.cmd',
    // Temporary/System
    '.tmp', '.temp', '.part', '.download', '.crdownload', '.ini', '.log', '.db', '.cache', '.lnk', '.url',
    // Premiere/Adobe files
    '.prproj', '.prlock', '.aep', '.aet', '.mogrt', '.pek', '.cfa', '.xmp', '.edl',
    // Camera sidecar / metadata files
    '.cpi', '.bim', '.smi', '.modd', '.moff', '.thm', '.idx',
    // RAW photo formats (not supported by Premiere video workflows)
    '.arw', '.cr2', '.cr3', '.nef', '.nrw', '.orf', '.rw2', '.pef', '.raf', '.dng', '.raw',
    // Other image/design formats usually not wanted for auto-import
    '.indd', '.eps', '.bmp', '.ico', '.avif', '.heic', '.heif', '.webp',
    // Audio formats not commonly used in video editing workflows
    '.flac', '.ape', '.alac', '.wma', '.ogg', '.opus',
    // Other non-media
    '.html', '.css', '.js', '.json', '.xml', '.svg', '.md', '.clipchamp', '.ytdl'
]);

let settings = {
    rootFolder: '',
    rootFolderLevels: 0, // How many parent levels to go up from project file (0 = same folder, 1 = parent, 2 = grandparent)
    autoRelink: true,
    excludedFolders: [],
    excludedFolderNames: ['Premiere Pro Auto-Save', 'Adobe Premiere Pro Auto-Save'],
    bannedExtensions: FM_DEFAULT_BANNED_EXTENSIONS.slice(),
    autoImport: false,
    autoImportInterval: 30,
    language: 'en', // Default language
    hostLogLevel: 'info' // Host-side log verbosity sent to ExtendScript
};

// Accepted host log levels mirrored from ExtendScript host script
const FM_ALLOWED_HOST_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

function fm_normalizeHostLogLevel(level) {
    const normalized = (level || '').toString().toLowerCase();
    return FM_ALLOWED_HOST_LOG_LEVELS.indexOf(normalized) >= 0 ? normalized : 'info';
}

// Push selected host log level to ExtendScript runtime
function fm_applyHostLogLevel(level) {
    const normalized = fm_normalizeHostLogLevel(level);
    settings.hostLogLevel = normalized;

    csInterface.evalScript(`FileManager_setLogLevel("${normalized}")`, (result) => {
        if (!result || result === 'EvalScript error.') {
            console.warn('Host log level update failed:', normalized);
            return;
        }

        try {
            const parsed = JSON.parse(result);
            if (parsed && parsed.success === true) {
                debugLog(`Host log level: ${parsed.logLevel || normalized}`, 'info');
            } else if (parsed && parsed.error) {
                console.warn('Host log level error:', parsed.error);
            }
        } catch (e) {
            console.warn('Host log level parse error:', e);
        }
    });

    return normalized;
}

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

// Debounced settings writer to reduce frequent disk writes during auto-import
let fm_settingsWriteDebounceTimer = null;
let fm_pendingSettingsWriteData = null;
const FM_SETTINGS_WRITE_DEBOUNCE_MS = 1500;

function fm_writeSettingsToFileDebounced(settingsData, delayMs = FM_SETTINGS_WRITE_DEBOUNCE_MS) {
    try {
        // Keep an immutable snapshot of the latest settings state
        fm_pendingSettingsWriteData = JSON.parse(JSON.stringify(settingsData));
    } catch (e) {
        fm_pendingSettingsWriteData = settingsData;
    }

    if (fm_settingsWriteDebounceTimer) {
        clearTimeout(fm_settingsWriteDebounceTimer);
    }

    fm_settingsWriteDebounceTimer = setTimeout(() => {
        fm_settingsWriteDebounceTimer = null;
        if (fm_pendingSettingsWriteData) {
            fm_writeSettingsToFile(fm_pendingSettingsWriteData);
            fm_pendingSettingsWriteData = null;
        }
    }, delayMs);

    return true;
}

// Flush debounced write before explicit save actions
function fm_flushDebouncedSettingsWrite() {
    if (fm_settingsWriteDebounceTimer) {
        clearTimeout(fm_settingsWriteDebounceTimer);
        fm_settingsWriteDebounceTimer = null;
    }

    if (fm_pendingSettingsWriteData) {
        fm_writeSettingsToFile(fm_pendingSettingsWriteData);
        fm_pendingSettingsWriteData = null;
    }
}

// Load settings from localStorage or persistent file
function loadSettings() {
    let migratedFromLocalStorage = false;
    let loadedSettings = null;
    let shouldPersistMergedDefaults = false;

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

    if (loadedSettings) {
        // Merge new defaults with existing user values without removing manual additions
        const userBannedExtensions = Array.isArray(loadedSettings.bannedExtensions) ? loadedSettings.bannedExtensions : [];
        const normalizedUserBannedExtensions = fm_normalizeExtensionList(userBannedExtensions);
        const mergedBannedExtensions = fm_normalizeExtensionList([
            ...FM_DEFAULT_BANNED_EXTENSIONS,
            ...normalizedUserBannedExtensions
        ]);

        // Persist automatically when an update introduced missing default extensions
        if (mergedBannedExtensions.join('\n') !== normalizedUserBannedExtensions.join('\n')) {
            shouldPersistMergedDefaults = true;
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
        settings.bannedExtensions = FM_DEFAULT_BANNED_EXTENSIONS.slice();
        console.log('First use: Applied default settings');

        // Save defaults to file immediately
        fm_writeSettingsToFile(settings);
    }

    // If migrated from localStorage, save to file
    if (migratedFromLocalStorage) {
        fm_writeSettingsToFile(settings);
        console.log('Migration complete: settings saved to persistent file storage');
    }

    // Save when new defaults were auto-added to existing settings
    if (shouldPersistMergedDefaults && !migratedFromLocalStorage) {
        fm_writeSettingsToFile(settings);
        console.log('Settings updated with new default banned extensions');
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
    document.getElementById('hostLogLevel').value = fm_normalizeHostLogLevel(settings.hostLogLevel);

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

    // Apply host logging level at startup from persisted settings
    fm_applyHostLogLevel(settings.hostLogLevel);
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
    settings.bannedExtensions = fm_normalizeExtensionList(bannedExtensionsText
        .split('\n')
        .map(ext => ext.trim())
        .filter(ext => ext !== ''));

    settings.autoImport = document.getElementById('autoImport').checked;
    settings.autoImportInterval = parseInt(document.getElementById('autoImportInterval').value) || 30;
    settings.hostLogLevel = fm_normalizeHostLogLevel(document.getElementById('hostLogLevel').value);

    // Apply host log level immediately so diagnostics follow current configuration
    fm_applyHostLogLevel(settings.hostLogLevel);

    // Handle language change
    const newLang = document.getElementById('languageSelect').value;
    if (newLang !== settings.language) {
        changeLanguage(newLang);
    }

    // Ensure no delayed write remains before explicit save
    fm_flushDebouncedSettingsWrite();

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

// Auto-add extensions flagged as truly incompatible by host import diagnostics
function fm_applySuggestedBannedExtensions(importResults, contextLabel) {
    if (!Array.isArray(importResults) || importResults.length === 0) {
        return [];
    }

    const currentBanned = fm_normalizeExtensionList(settings.bannedExtensions || []);
    const suggested = [];

    importResults.forEach((result) => {
        if (!result || result.success !== false) {
            return;
        }

        // Only add when host explicitly classified as incompatible format
        if (result.incompatibleFormat !== true) {
            return;
        }

        const normalizedSuggestion = fm_normalizeExtensionList([result.suggestedBanExtension || '']);
        if (normalizedSuggestion.length === 0) {
            return;
        }

        suggested.push(normalizedSuggestion[0]);
    });

    if (suggested.length === 0) {
        return [];
    }

    const merged = fm_normalizeExtensionList([
        ...currentBanned,
        ...suggested
    ]);

    const added = merged.filter((ext) => currentBanned.indexOf(ext) === -1);
    if (added.length === 0) {
        return [];
    }

    settings.bannedExtensions = merged;
    fm_writeSettingsToFileDebounced(settings);
    localStorage.setItem('fileManagerSettings', JSON.stringify(settings));

    // Keep settings UI in sync when panel is open
    const bannedExtensionsField = document.getElementById('bannedExtensions');
    if (bannedExtensionsField) {
        bannedExtensionsField.value = merged.join('\n');
    }

    debugLog(`Banlist auto-mise à jour (${contextLabel || 'import'}): ${added.join(', ')}`, 'warning');
    return added;
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
const FM_MAX_DEBUG_LOG_ENTRIES = 1000;

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

        // Keep debug panel memory usage bounded over long sessions
        while (debugLogs.children.length > FM_MAX_DEBUG_LOG_ENTRIES) {
            debugLogs.removeChild(debugLogs.firstChild);
        }

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

// Import files in batches to avoid oversized payloads and improve stability
const FM_IMPORT_BATCH_SIZE = 100;

function fm_chunkArray(items, chunkSize) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}

function fm_evalScriptPromise(script) {
    return new Promise((resolve) => {
        csInterface.evalScript(script, (result) => resolve(result));
    });
}

async function fm_importFilesInBatches(filesToImport, options = {}) {
    const batchSize = options.batchSize || FM_IMPORT_BATCH_SIZE;
    const contextLabel = options.contextLabel || 'import';
    const enableSuggestedAutoBan = options.enableSuggestedAutoBan === true;
    const batches = fm_chunkArray(filesToImport || [], batchSize);
    const allResults = [];
    const autoAddedExtensions = new Set();

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(batch))));
        const rawResult = await fm_evalScriptPromise(`FileManager_importFilesToProjectBase64('${base64Data}')`);

        let parsed;
        try {
            parsed = JSON.parse(rawResult);
        } catch (e) {
            throw new Error(`Batch ${batchIndex + 1} parse error: ${e.message}`);
        }

        if (parsed.error) {
            throw new Error(parsed.error);
        }

        const batchResults = Array.isArray(parsed.results) ? parsed.results : [];
        if (enableSuggestedAutoBan) {
            const autoAdded = fm_applySuggestedBannedExtensions(batchResults, contextLabel);
            autoAdded.forEach((ext) => autoAddedExtensions.add(ext));
        }

        for (let i = 0; i < batchResults.length; i++) {
            allResults.push(batchResults[i]);
        }

        if (typeof options.onBatchComplete === 'function') {
            options.onBatchComplete({
                batchIndex: batchIndex + 1,
                totalBatches: batches.length,
                batchSize: batch.length,
                results: batchResults
            });
        }
    }

    return {
        results: allResults,
        autoAddedExtensions: Array.from(autoAddedExtensions)
    };
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

    csInterface.evalScript(importScript, async (importResult) => {
        try {
            const importData = JSON.parse(importResult);
            const filesToImport = importData.newFiles || [];

            if (filesToImport.length === 0) {
                compactImportBtn.disabled = false;
                return;
            }

            // Import in batches for better stability on large payloads
            const importOutcome = await fm_importFilesInBatches(filesToImport, {
                contextLabel: 'compact import',
                enableSuggestedAutoBan: false
            });

            if (importOutcome.autoAddedExtensions.length > 0) {
                showStatus(`Banlist mise à jour automatiquement: ${importOutcome.autoAddedExtensions.join(', ')}`, 'warning');
            }

            compactImportBtn.disabled = false;
        } catch (e) {
            console.error('Compact import error:', e);
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

    debugLog(`Import batché de ${selectedFiles.length} fichier(s)`, 'info');

    (async () => {
        try {
            const importOutcome = await fm_importFilesInBatches(selectedFiles, {
                contextLabel: 'manual import',
                enableSuggestedAutoBan: false,
                onBatchComplete: ({ batchIndex, totalBatches }) => {
                    debugLog(`Batch import ${batchIndex}/${totalBatches} terminé`, 'info');
                }
            });

            const results = importOutcome.results || [];
            const successCount = results.filter(r => r.success).length;

            if (importOutcome.autoAddedExtensions.length > 0) {
                showStatus(`${successCount} fichier(s) importé(s). Banlist auto-maj: ${importOutcome.autoAddedExtensions.join(', ')}`, 'warning');
            } else {
                showStatus(`${successCount} fichier(s) importé(s) avec succès`, 'success');
            }

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
    })();

    debugLog('Import par lots initié, en attente des réponses ExtendScript...', 'info');
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
                        try {
                            const importOutcome = await fm_importFilesInBatches(newFiles, {
                                contextLabel: 'auto import',
                                enableSuggestedAutoBan: true
                            });
                            const successCount = (importOutcome.results || []).filter(r => r.success).length;
                            console.log(`Auto-import: ${successCount} fichier(s) importé(s)`);

                            if (importOutcome.autoAddedExtensions.length > 0) {
                                console.log(`Auto-import: banlist auto-mise à jour (${importOutcome.autoAddedExtensions.join(', ')})`);
                            }
                        } catch (importError) {
                            console.error('Auto-import import error:', importError);
                        } finally {
                            isImporting = false;
                        }
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

    // Persist immediately so auto-import state survives Premiere restart
    if (fm_settingsWriteDebounceTimer) {
        clearTimeout(fm_settingsWriteDebounceTimer);
        fm_settingsWriteDebounceTimer = null;
    }
    fm_pendingSettingsWriteData = null;
    fm_writeSettingsToFile(settings);

    // Keep localStorage as legacy/backup storage
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
