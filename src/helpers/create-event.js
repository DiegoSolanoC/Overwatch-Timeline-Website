/**
 * Event Creation Helper
 * 
 * This script helps create events by looking up city coordinates automatically.
 * 
 * Usage:
 * 1. Run this script: node src/helpers/create-event.js
 * 2. Or use the function directly in your code
 * 
 * Example:
 *   createEventFromCity("Tokyo", "Tokyo Summit", "Description here", [], [], "image.jpg")
 */

const fs = require('fs');
const path = require('path');

/**
 * Find city coordinates by name (searches cities, airports, and seaports)
 * @param {string} cityName - Name of the city to find
 * @returns {Object|null} - { lat, lon } or null if not found
 */
function findCityCoordinates(cityName) {
    const locationsPath = path.join(__dirname, '../data/locations.json');
    const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
    
    // Search in cities
    const city = locationsData.cities.find(c => 
        c.name.toLowerCase() === cityName.toLowerCase()
    );
    if (city) {
        return { lat: city.lat, lon: city.lon };
    }
    
    // Search in fictional cities
    const fictionalCity = locationsData.fictionalCities.find(c => 
        c.name.toLowerCase() === cityName.toLowerCase()
    );
    if (fictionalCity) {
        return { lat: fictionalCity.lat, lon: fictionalCity.lon };
    }
    
    // Search in airports
    const airport = locationsData.airports.find(a => 
        a.name.toLowerCase().includes(cityName.toLowerCase()) ||
        cityName.toLowerCase().includes(a.name.toLowerCase())
    );
    if (airport) {
        return { lat: airport.lat, lon: airport.lon };
    }
    
    // Search in seaports
    const seaport = locationsData.seaports.find(s => 
        s.name.toLowerCase() === cityName.toLowerCase()
    );
    if (seaport) {
        return { lat: seaport.lat, lon: seaport.lon };
    }
    
    return null;
}

/**
 * Create an event entry from a city name
 * @param {string} cityName - Name of the city (will look up coordinates)
 * @param {string} eventName - Name/title of the event
 * @param {string} description - Event description paragraph
 * @param {Array<string>} filters - Array of hero names
 * @param {Array<string>} factions - Array of faction names
 * @param {string} image - Image file path (optional, defaults to empty string)
 * @returns {Object|null} - Event object or null if city not found
 */
function createEventFromCity(cityName, eventName, description, filters = [], factions = [], image = '') {
    const coords = findCityCoordinates(cityName);
    
    if (!coords) {
        console.error(`❌ City "${cityName}" not found in locations.json`);
        console.log('\nAvailable cities:');
        const locationsPath = path.join(__dirname, '../data/locations.json');
        const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
        locationsData.cities.forEach(c => console.log(`  - ${c.name}`));
        return null;
    }
    
    const event = {
        name: eventName,
        lat: coords.lat,
        lon: coords.lon,
        description: description,
        image: image,
        filters: filters,
        factions: factions
    };
    
    console.log('✅ Event created:');
    console.log(JSON.stringify(event, null, 2));
    console.log('\n📋 Copy this JSON and add it to data/locations.json in the "events" array');
    
    return event;
}

/**
 * Add event directly to locations.json
 * @param {string} cityName - Name of the city
 * @param {string} eventName - Name/title of the event
 * @param {string} description - Event description paragraph
 * @param {Array<string>} filters - Array of hero names
 * @param {Array<string>} factions - Array of faction names
 * @param {string} image - Image file path (optional)
 * @returns {boolean} - True if successful
 */
function addEventToFile(cityName, eventName, description, filters = [], factions = [], image = '') {
    const event = createEventFromCity(cityName, eventName, description, filters, factions, image);
    
    if (!event) {
        return false;
    }
    
    const locationsPath = path.join(__dirname, '../data/locations.json');
    const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
    
    // Check if event with same name already exists
    const existingIndex = locationsData.events.findIndex(e => e.name === eventName);
    if (existingIndex !== -1) {
        console.log(`⚠️  Event "${eventName}" already exists. Updating...`);
        locationsData.events[existingIndex] = event;
    } else {
        locationsData.events.push(event);
    }
    
    // Write back to file with proper formatting
    fs.writeFileSync(
        locationsPath,
        JSON.stringify(locationsData, null, 2) + '\n',
        'utf8'
    );
    
    console.log('✅ Event added to locations.json');
    return true;
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        findCityCoordinates,
        createEventFromCity,
        addEventToFile
    };
}

// If run directly, provide interactive CLI
if (require.main === module) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log('🎯 Event Creation Helper\n');
    console.log('This will help you create an event by looking up city coordinates.\n');
    
    const questions = [
        'City name: ',
        'Event title/name: ',
        'Event description: ',
        'Hero filters (comma-separated, e.g., "Tracer, Soldier 76"): ',
        'Faction filters (comma-separated, e.g., "00Overwatch, 01Overwatch 2"): ',
        'Image file path (optional, press Enter to skip): '
    ];
    
    const answers = [];
    let currentQuestion = 0;
    
    function askQuestion() {
        if (currentQuestion >= questions.length) {
            const cityName = answers[0];
            const eventName = answers[1];
            const description = answers[2];
            const filters = answers[3] ? answers[3].split(',').map(f => f.trim()).filter(f => f) : [];
            const factions = answers[4] ? answers[4].split(',').map(f => f.trim()).filter(f => f) : [];
            const image = answers[5] || '';
            
            console.log('\n');
            const success = addEventToFile(cityName, eventName, description, filters, factions, image);
            
            if (success) {
                console.log('\n✨ Event creation complete!');
            } else {
                console.log('\n❌ Event creation failed. Please check the city name.');
            }
            
            rl.close();
            return;
        }
        
        rl.question(questions[currentQuestion], (answer) => {
            answers.push(answer);
            currentQuestion++;
            askQuestion();
        });
    }
    
    askQuestion();
}



