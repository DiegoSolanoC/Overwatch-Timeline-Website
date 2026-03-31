/**
 * Palette-specific default background-music tracks (shuffle off / skip / first load).
 * Blue & Dark (gray): Winston's Desk — Crimson: The Wolf's Talon — Nulled: Null Sector
 */
(function () {
    'use strict';

    function normalizePaletteKey(saved) {
        if (saved === 'gray') return 'gray';
        if (saved === 'crimson') return 'crimson';
        if (saved === 'nulled') return 'nulled';
        return 'blue';
    }

    function getActiveMusicPaletteKey() {
        try {
            return normalizePaletteKey(localStorage.getItem('colorPalette'));
        } catch (_) {
            return 'blue';
        }
    }

    /**
     * @param {Array<{filename:string,name:string}>} musicFiles
     * @param {string} paletteKey - blue | gray | crimson | nulled
     */
    function findDefaultMusicForPalette(musicFiles, paletteKey) {
        if (!musicFiles || musicFiles.length === 0) return null;
        const key = normalizePaletteKey(paletteKey);
        const lowerName = function (s) {
            return s && s.name ? String(s.name).toLowerCase() : '';
        };
        var find = function (pred) {
            for (var i = 0; i < musicFiles.length; i++) {
                if (pred(lowerName(musicFiles[i]))) return musicFiles[i];
            }
            return null;
        };

        if (key === 'crimson') {
            var w = find(function (n) { return n.indexOf('wolf') !== -1 && n.indexOf('talon') !== -1; });
            if (w) return w;
        } else if (key === 'nulled') {
            var ns = find(function (n) { return n.indexOf('null sector') !== -1; });
            if (ns) return ns;
        } else {
            var wd = find(function (n) { return n.indexOf('winston') !== -1 && n.indexOf('desk') !== -1; });
            if (wd) return wd;
            wd = find(function (n) { return n.indexOf('winston') !== -1 || n.indexOf('desk') !== -1; });
            if (wd) return wd;
        }
        return musicFiles[0];
    }

    /**
     * Default track for this palette first; remaining tracks keep manifest order.
     * @param {Array<{filename:string,name:string}>} musicFiles
     * @param {string} paletteKey
     */
    function orderMusicFilesWithDefaultFirst(musicFiles, paletteKey) {
        if (!musicFiles || musicFiles.length === 0) return [];
        var def = findDefaultMusicForPalette(musicFiles, paletteKey);
        if (!def || !def.filename) return musicFiles.slice();
        var rest = [];
        for (var i = 0; i < musicFiles.length; i++) {
            if (musicFiles[i].filename !== def.filename) rest.push(musicFiles[i]);
        }
        return [def].concat(rest);
    }

    function musicPathForEntry(entry) {
        if (!entry || !entry.filename) return null;
        return 'assets/audio/music/' + entry.filename;
    }

    function pathMatchesMusicFile(path, file) {
        if (!path || !file || !file.filename) return false;
        var parts = path.split('/');
        var tail = parts[parts.length - 1] || '';
        try {
            var decoded = decodeURIComponent(tail);
            return decoded === file.filename || tail === file.filename;
        } catch (_) {
            return tail === file.filename;
        }
    }

    function currentPathIsPaletteDefault(currentPath, musicFiles, paletteKey) {
        var def = findDefaultMusicForPalette(musicFiles, paletteKey);
        if (!def) return false;
        return pathMatchesMusicFile(currentPath, def);
    }

    function notifyMusicDefaultPaletteChange(previousPalette, newPalette) {
        try {
            var m = window.MusicManager;
            if (m && typeof m.onPaletteChanged === 'function') {
                m.onPaletteChanged(previousPalette, newPalette);
            }
        } catch (e) {
            console.error(e);
        }
    }

    window.MusicPaletteDefaultHelpers = {
        normalizePaletteKey: normalizePaletteKey,
        getActiveMusicPaletteKey: getActiveMusicPaletteKey,
        findDefaultMusicForPalette: findDefaultMusicForPalette,
        orderMusicFilesWithDefaultFirst: orderMusicFilesWithDefaultFirst,
        musicPathForEntry: musicPathForEntry,
        pathMatchesMusicFile: pathMatchesMusicFile,
        currentPathIsPaletteDefault: currentPathIsPaletteDefault,
        notifyMusicDefaultPaletteChange: notifyMusicDefaultPaletteChange
    };
})();
