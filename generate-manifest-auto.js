// Auto-run version of generate-manifest.js
// This will be called automatically on page load via a simple HTTP request
// Since we can't run Node.js directly from the browser, we'll use a workaround

const fs = require('fs');
const path = require('path');

const heroesFolder = './Heroes';
const factionsFolder = './Factions';
const musicFolder = './Music';

function getFilesInFolder(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        return files
            .filter(file => file.toLowerCase().endsWith('.png'))
            .map(file => file.replace('.png', ''))
            .sort();
    } catch (error) {
        console.error(`Error reading folder ${folderPath}:`, error);
        return [];
    }
}

function getFactionsWithNumbers(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        const factions = files
            .filter(file => file.toLowerCase().endsWith('.png'))
            .map(file => {
                const match = file.match(/^(\d+)(.+)$/);
                if (match) {
                    return {
                        filename: file.replace('.png', ''),
                        number: parseInt(match[1], 10),
                        displayName: match[2].trim().replace('.png', '')
                    };
                }
                return {
                    filename: file.replace('.png', ''),
                    number: 999,
                    displayName: file.replace('.png', '')
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
            .filter(file => {
                const lower = file.toLowerCase();
                return lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg');
            })
            .map(file => ({
                filename: file,
                name: file.replace(/\.(mp3|wav|ogg)$/i, '')
            }));
        
        const sorted = musicFiles.sort((a, b) => {
            const aIsDefault = a.name.toLowerCase().includes('winston') || a.name.toLowerCase().includes('desk');
            const bIsDefault = b.name.toLowerCase().includes('winston') || b.name.toLowerCase().includes('desk');
            
            if (aIsDefault && !bIsDefault) return -1;
            if (!aIsDefault && bIsDefault) return 1;
            return a.name.localeCompare(b.name);
        });
        
        return sorted;
    } catch (error) {
        console.error(`Error reading folder ${folderPath}:`, error);
        return [];
    }
}

const heroes = getFilesInFolder(heroesFolder);
const factions = getFactionsWithNumbers(factionsFolder);
const music = getMusicFiles(musicFolder);

const manifest = {
    heroes: heroes,
    factions: factions.map(f => ({
        filename: f.filename,
        number: f.number,
        displayName: f.displayName
    })),
    music: music
};

fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
console.log('Manifest generated successfully!');
console.log(`Found ${heroes.length} heroes, ${factions.length} factions, and ${music.length} music files.`);



