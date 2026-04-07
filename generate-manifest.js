// Regenerate manifest.json from assets (heroes / factions PNGs, music audio).
// Run: node generate-manifest.js

const fs = require('fs');
const path = require('path');

const heroesFolder = './assets/images/heroes';
const factionsFolder = './assets/images/factions';
const musicFolder = './assets/audio/music';

/** Locale-aware sort so "51" orders like a number among hero names */
function sortHeroBasenames(names) {
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function getHeroesFromFolder(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        return sortHeroBasenames(
            files
                .filter((file) => file.toLowerCase().endsWith('.png'))
                .map((file) => file.replace(/\.png$/i, ''))
        );
    } catch (error) {
        console.error(`Error reading folder ${folderPath}:`, error);
        return [];
    }
}

function getFactionsFromFolder(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        const factions = files
            .filter((file) => file.toLowerCase().endsWith('.png'))
            .map((file) => {
                const base = file.replace(/\.png$/i, '');
                const match = base.match(/^(\d+)(.+)$/);
                if (match) {
                    return {
                        filename: base,
                        number: parseInt(match[1], 10),
                        displayName: match[2].trim()
                    };
                }
                return {
                    filename: base,
                    number: 999,
                    displayName: base
                };
            })
            .sort((a, b) => a.number - b.number);
        return factions;
    } catch (error) {
        console.error(`Error reading folder ${folderPath}:`, error);
        return [];
    }
}

function getMusicFiles(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        const musicFiles = files
            .filter((file) => {
                const lower = file.toLowerCase();
                return lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg');
            })
            .map((file) => ({
                filename: file,
                name: file.replace(/\.(mp3|wav|ogg)$/i, '')
            }));

        return musicFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } catch (error) {
        console.error(`Error reading folder ${folderPath}:`, error);
        return [];
    }
}

const heroes = getHeroesFromFolder(heroesFolder);
const factions = getFactionsFromFolder(factionsFolder);
const music = getMusicFiles(musicFolder);

const manifest = {
    heroes,
    factions: factions.map((f) => ({
        filename: f.filename,
        number: f.number,
        displayName: f.displayName
    })),
    music
};

fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
console.log('manifest.json written from disk assets.');
console.log(`  heroes: ${heroes.length}, factions: ${factions.length}, music: ${music.length}`);
