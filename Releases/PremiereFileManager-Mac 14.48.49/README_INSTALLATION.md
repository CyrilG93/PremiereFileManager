# File Manager - Extension pour Adobe Premiere Pro

Extension pour Adobe Premiere Pro 2025 (25.5+) qui synchronise automatiquement les fichiers du projet en copiant les médias externes dans la structure de dossiers du projet.

## Fonctionnalités

- **Analyse du projet** : Parcourt tous les fichiers utilisés dans le projet Premiere Pro
- **Détection des fichiers externes** : Identifie les fichiers qui proviennent d'emplacements en dehors du dossier du projet
- **Synchronisation intelligente** : Copie les fichiers externes dans la structure de dossiers du projet en respectant l'arborescence des bins
- **Préservation de la structure** : Maintient la hiérarchie des sous-dossiers
- **Liaison automatique** : Relie les médias dans Premiere Pro après la copie
- **Gestion des conflits** : Ignore les fichiers déjà présents (pas de remplacement)
- **Compatible Mac et Windows** : Gestion des chemins multi-plateformes

## Structure du projet

L'extension fonctionne avec une structure de projet comme celle-ci :

```
NOM_PROJET/
├── MEDIAS/
├── ELEMENTS/
├── AUDIO/
├── SEQUENCE/
│   └── Projet1.prproj
```

## Installation

### macOS

1. Ouvrez le Terminal
2. Naviguez vers le dossier de l'extension :
   ```bash
   cd /chemin/vers/PremiereFileManager
   ```
3. Rendez le script exécutable :
   ```bash
   chmod +x install_macos.sh
   ```
4. Exécutez le script d'installation :
   ```bash
   ./install_macos.sh
   ```
5. Redémarrez Adobe Premiere Pro

### Windows

1. Double-cliquez sur `install_windows.bat`
2. Suivez les instructions à l'écran
3. Redémarrez Adobe Premiere Pro

### Activer le mode debug (si nécessaire)

Si l'extension n'apparaît pas dans Premiere Pro, vous devez activer le mode debug pour les extensions CEP.

**macOS :**
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

**Windows :**
1. Ouvrez l'Éditeur du Registre (regedit)
2. Naviguez vers `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
3. Créez une nouvelle valeur DWORD nommée `PlayerDebugMode` avec la valeur `1`

## Utilisation

1. Ouvrez Adobe Premiere Pro
2. Ouvrez l'extension : **Fenêtre > Extensions > File Manager**
3. L'extension affiche les informations du projet actif

### Configuration

1. Cliquez sur l'icône **⚙️ Paramètres** en haut à droite
2. **Dossier racine du projet** : 
   - Laissez vide pour la détection automatique (recommandé)
   - Ou spécifiez manuellement le chemin du dossier racine
3. **Relier automatiquement les médias** : Active/désactive la liaison automatique après copie
4. Cliquez sur **Enregistrer**

### Analyser le projet

1. Cliquez sur **Analyser le projet**
2. L'extension parcourt tous les fichiers du projet
3. Une liste des fichiers externes s'affiche avec :
   - Le nom du fichier
   - L'emplacement actuel
   - Le bin de destination dans Premiere Pro

### Synchroniser les fichiers

1. Cochez les fichiers que vous souhaitez synchroniser
   - **Tout sélectionner** : Sélectionne tous les fichiers
   - **Tout désélectionner** : Désélectionne tous les fichiers
2. Cliquez sur **Synchroniser**
3. L'extension copie les fichiers dans le dossier du projet
4. Si la liaison automatique est activée, les médias sont reliés dans Premiere Pro
5. Un rapport de synchronisation s'affiche avec le statut de chaque fichier

## Exemple d'utilisation

### Scénario

Vous avez un projet Premiere Pro avec cette structure :

```
MonProjet/
├── MEDIAS/
├── ELEMENTS/
│   └── Photos/
├── SEQUENCE/
│   └── MonProjet.prproj
```

Dans Premiere Pro, vous avez importé :
- Des vidéos depuis `D:/BaseDesDonnees/Videos/`
- Des photos dans le bin `ELEMENTS/Photos` depuis `C:/Users/Desktop/Images/`

### Synchronisation

1. Ouvrez l'extension File Manager
2. Cliquez sur **Analyser le projet**
3. L'extension détecte les fichiers externes :
   - `video1.mp4` → Sera copié dans `MonProjet/MEDIAS/`
   - `photo1.jpg` → Sera copié dans `MonProjet/ELEMENTS/Photos/`
4. Cliquez sur **Synchroniser**
5. Les fichiers sont copiés et reliés automatiquement

Résultat :
```
MonProjet/
├── MEDIAS/
│   └── video1.mp4
├── ELEMENTS/
│   └── Photos/
│       └── photo1.jpg
├── SEQUENCE/
│   └── MonProjet.prproj
```

## Dépannage

### L'extension n'apparaît pas dans Premiere Pro

- Vérifiez que le mode debug est activé (voir section Installation)
- Redémarrez Premiere Pro
- Vérifiez que l'extension est bien installée dans le dossier CEP

### Erreur "No active project"

- Assurez-vous qu'un projet est ouvert dans Premiere Pro
- Enregistrez le projet avant d'utiliser l'extension

### Les fichiers ne sont pas copiés

- Vérifiez que vous avez les permissions d'écriture sur le dossier du projet
- Vérifiez que le dossier racine est correctement configuré dans les paramètres
- Consultez les logs pour plus de détails sur les erreurs

## Support

Pour toute question ou problème, veuillez créer une issue sur le dépôt GitHub.

## Licence

Pour usage personnel uniquement.

## Version

Version 1.0.0 - Compatible avec Adobe Premiere Pro 2025 (25.5+)
