/**
 * DataModel - Manages location and connection data
 * Loads data from JSON files and provides access methods
 */
export class DataModel {
    constructor() {
        this.cities = [];
        this.airports = [];
        this.seaports = [];
        this.trainConnections = [];
        this.secondaryConnections = [];
        this.seaportConnections = [];
        this.loaded = false;
    }

    /**
     * Load all data from JSON files
     * @returns {Promise<void>}
     */
    async loadData() {
        try {
            // Load locations
            const locationsResponse = await fetch('data/locations.json');
            const locationsData = await locationsResponse.json();
            this.cities = locationsData.cities || [];
            this.airports = locationsData.airports || [];
            this.seaports = locationsData.seaports || [];

            // Load connections
            const connectionsResponse = await fetch('data/connections.json');
            const connectionsData = await connectionsResponse.json();
            this.trainConnections = connectionsData.trainConnections || [];
            this.secondaryConnections = connectionsData.secondaryConnections || [];
            this.seaportConnections = connectionsData.seaportConnections || [];

            // Filter out seaports with 0 connections
            this.filterSeaports();

            this.loaded = true;
            console.log('DataModel: All data loaded successfully');
        } catch (error) {
            console.error('DataModel: Error loading data:', error);
            throw error;
        }
    }

    /**
     * Filter out seaports with no connections
     */
    filterSeaports() {
        const connectionCounts = {};
        this.seaports.forEach(port => {
            connectionCounts[port.name] = 0;
        });

        // Count connections (both from and to)
        this.seaportConnections.forEach(conn => {
            if (connectionCounts.hasOwnProperty(conn.from)) {
                connectionCounts[conn.from]++;
            }
            if (connectionCounts.hasOwnProperty(conn.to)) {
                connectionCounts[conn.to]++;
            }
        });

        // Find ports with 0 connections
        const portsToRemove = new Set();
        Object.keys(connectionCounts).forEach(portName => {
            if (connectionCounts[portName] === 0) {
                portsToRemove.add(portName);
                console.log(`DataModel: Removing port with 0 connections: ${portName}`);
            }
        });

        // Filter seaports array
        this.seaports = this.seaports.filter(port => !portsToRemove.has(port.name));

        // Filter seaportConnections to remove any connections referencing deleted ports
        this.seaportConnections = this.seaportConnections.filter(conn => 
            !portsToRemove.has(conn.from) && !portsToRemove.has(conn.to)
        );

        console.log(`DataModel: Filtered seaports: ${this.seaports.length} ports remaining (removed ${portsToRemove.size})`);
    }

    /**
     * Get city by name
     * @param {string} name - City name
     * @returns {Object|null}
     */
    getCity(name) {
        return this.cities.find(city => city.name === name) || null;
    }

    /**
     * Get airport by name
     * @param {string} name - Airport name
     * @returns {Object|null}
     */
    getAirport(name) {
        return this.airports.find(airport => airport.name === name) || null;
    }

    /**
     * Get seaport by name
     * @param {string} name - Seaport name
     * @returns {Object|null}
     */
    getSeaport(name) {
        return this.seaports.find(port => port.name === name) || null;
    }

    /**
     * Get all cities
     * @returns {Array}
     */
    getAllCities() {
        return this.cities;
    }

    /**
     * Get all airports
     * @returns {Array}
     */
    getAllAirports() {
        return this.airports;
    }

    /**
     * Get all seaports
     * @returns {Array}
     */
    getAllSeaports() {
        return this.seaports;
    }

    /**
     * Get train connections
     * @returns {Array}
     */
    getTrainConnections() {
        return this.trainConnections;
    }

    /**
     * Get secondary connections
     * @returns {Array}
     */
    getSecondaryConnections() {
        return this.secondaryConnections;
    }

    /**
     * Get seaport connections
     * @returns {Array}
     */
    getSeaportConnections() {
        return this.seaportConnections;
    }
}


