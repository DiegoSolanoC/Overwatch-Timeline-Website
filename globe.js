// 3D Globe with Three.js
let scene, camera, renderer, globe, markers = [];
let stars = null; // Starfield for background
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationVelocity = { x: 0, y: 0 };
let autoRotate = true;
let activeMarker = null;
let labelElement = null;
let autoRotateTimeout = null;
let autoRotateEnabled = true; // User preference for auto-rotation
let hyperloopVisible = true; // User preference for hyperloop visibility

// Page visibility tracking
let isPageVisible = true;
let trainSpawnInterval = null;

// Debug mode for phantom wagon tracking
const DEBUG_PHANTOM_WAGONS = false; // Disabled - set to true if phantoms return

// Train system
let trains = [];
let routeCurves = []; // Store all route curves for train animation
let routeGraph = {}; // Graph of city connections for multi-stop routes
let routeReservations = {}; // Track which routes are currently in use

// Main connection lines (golden, solid, thick glow)
const connections = [
    // Americas route
    { from: "Seattle", to: "Toronto" },
    { from: "Toronto", to: "Midtown" },
    { from: "Seattle", to: "Mexico City" },
    { from: "Mexico City", to: "Caracas" },
    { from: "Caracas", to: "Paraiso" },
    
    // Pacific routes
    { from: "Seattle", to: "Hawaii" },
    { from: "Hawaii", to: "Sydney" },
    { from: "Sydney", to: "Melbourne" },
    { from: "Hawaii", to: "Tokyo" },
    
    // Asia-Pacific routes
    { from: "Tokyo", to: "Busan" },
    { from: "Busan", to: "Shanghai" },
    { from: "Tokyo", to: "Melbourne" },
    
    // Indian Ocean & Asia routes
    { from: "Shanghai", to: "Lijiang" },
    { from: "Lijiang", to: "Nagpur" },
    { from: "Nagpur", to: "Melbourne" },
    { from: "Nagpur", to: "Oasis" },
    
    // Africa-Middle East routes
    { from: "Oasis", to: "Cape Town" },
    { from: "Cape Town", to: "Numbani" },
    { from: "Numbani", to: "Aatlis" },
    { from: "Aatlis", to: "Paraiso" },
    
    // Europe-Asia routes
    { from: "Shanghai", to: "Moscow" },
    { from: "Nagpur", to: "Moscow" },
    
    // Europe-Americas routes
    { from: "Midtown", to: "Moscow" },
    { from: "Moscow", to: "Zurich" },
    { from: "Zurich", to: "Aatlis" },
    { from: "Moscow", to: "Kings Row" },
    { from: "Midtown", to: "Kings Row" },
    
    // North Africa-Europe-Americas hub (Aatlis)
    { from: "Midtown", to: "Atlantic Arcology" },
    { from: "Atlantic Arcology", to: "Aatlis" },
    { from: "Aatlis", to: "Esperança" },
    { from: "Esperança", to: "Kings Row" }
];

// Secondary connection lines (white, solid, thin glow)
const secondaryConnections = [
    // Bucharest hub
    { from: "Bucharest", to: "Moscow" },
    { from: "Bucharest", to: "Cairo" },
    { from: "Bucharest", to: "Colosseo" },
    { from: "Bucharest", to: "Berlin" },
    
    // Cairo hub
    { from: "Cairo", to: "Oasis" },
    { from: "Cairo", to: "Numbani" },
    { from: "Cairo", to: "Aatlis" },
    
    // Atlantic connection
    { from: "Esperança", to: "Atlantic Arcology" },
    { from: "Atlantic Arcology", to: "Kings Row" },
    
    // Western Europe network
    { from: "Kings Row", to: "Paris" },
    { from: "Paris", to: "Monte Carlo" },
    { from: "Monte Carlo", to: "Malevento" },
    { from: "Malevento", to: "Colosseo" },
    
    // Central Europe network
    { from: "Malevento", to: "Zurich" },
    { from: "Zurich", to: "Paris" },
    { from: "Zurich", to: "Berlin" },
    
    // Northern Europe network
    { from: "Berlin", to: "Gothenburg" },
    { from: "Gothenburg", to: "Moscow" },
    { from: "Berlin", to: "Kings Row" },
    
    // Asia secondary
    { from: "Hong Kong", to: "Shanghai" },
    { from: "Hong Kong", to: "Lijiang" },
    
    // North America secondary
    { from: "Houston", to: "Mexico City" },
    { from: "Houston", to: "Midtown" },
    { from: "Houston", to: "Los Angeles" },
    { from: "Los Angeles", to: "Blizzard World" },
    { from: "Los Angeles", to: "Seattle" }
];

// City data - Overwatch Timeline locations
const cities = [
    // North America
    { name: "Houston", lat: 29.7604, lon: -95.3698 },
    { name: "Midtown", lat: 40.7527, lon: -73.9772 },
    { name: "Toronto", lat: 43.6532, lon: -79.3832 },
    { name: "Blizzard World", lat: 33.6846, lon: -117.0 },
    { name: "Los Angeles", lat: 34.0522, lon: -119.2 },
    { name: "Seattle", lat: 47.6062, lon: -122.3321 },
    { name: "Mexico City", lat: 19.4326, lon: -99.1332 },
    { name: "Hawaii", lat: 21.3099, lon: -157.8581 },
    
    // South America
    { name: "Paraiso", lat: -22.9068, lon: -43.1729 },
    { name: "Caracas", lat: 10.4806, lon: -66.9036 },
    
    // Europe
    { name: "Kings Row", lat: 51.5074, lon: -0.1278 },
    { name: "Monte Carlo", lat: 43.7384, lon: 7.4246 },
    { name: "Colosseo", lat: 41.9028, lon: 12.7 },
    { name: "Malevento", lat: 43.7696, lon: 11.6 },
    { name: "Esperança", lat: 41.1579, lon: -8.6291 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Berlin", lat: 52.5200, lon: 13.4050 },
    { name: "Gothenburg", lat: 57.7089, lon: 11.9746 },
    { name: "Zurich", lat: 47.3769, lon: 8.5417 },
    { name: "Bucharest", lat: 44.4268, lon: 26.1025 },
    { name: "Moscow", lat: 55.7558, lon: 37.6173 },
    
    // Atlantic
    { name: "Atlantic Arcology", lat: 37.7412, lon: -25.6756 },
    
    // Africa
    { name: "Numbani", lat: 12.0022, lon: 8.5919 },
    { name: "Aatlis", lat: 34.0209, lon: -6.8416 },
    { name: "Cairo", lat: 30.0444, lon: 31.2357 },
    { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
    
    // Middle East
    { name: "Oasis", lat: 29.5918, lon: 52.5836 },
    
    // Asia
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Shanghai", lat: 31.2304, lon: 121.4737 },
    { name: "Hong Kong", lat: 22.3193, lon: 114.1694 },
    { name: "Busan", lat: 35.1796, lon: 129.0756 },
    { name: "Lijiang", lat: 26.8721, lon: 100.2330 },
    { name: "Nagpur", lat: 21.1458, lon: 79.0882 },
    
    // Oceania
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    { name: "Melbourne", lat: -37.8136, lon: 144.9631 }
];

// Major airports for air travel (busiest worldwide, spread across continents)
const airports = [
    // North America
    { name: "Atlanta", lat: 33.6407, lon: -84.4277 },
    { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
    { name: "Chicago", lat: 41.9742, lon: -87.9073 },
    { name: "Dallas", lat: 32.8998, lon: -97.0403 },
    { name: "Denver", lat: 39.8561, lon: -104.6737 },
    { name: "New York JFK", lat: 40.6413, lon: -73.7781 },
    { name: "San Francisco", lat: 37.6213, lon: -122.3790 },
    { name: "Toronto Pearson", lat: 43.6777, lon: -79.6248 },
    { name: "Mexico City", lat: 19.4363, lon: -99.0721 },
    
    // Central America & Caribbean
    { name: "San Jose Costa Rica", lat: 9.9936, lon: -84.2080 },
    { name: "Port-au-Prince Haiti", lat: 18.5800, lon: -72.2926 },
    { name: "Havana", lat: 22.9892, lon: -82.4091 },
    
    // South America
    { name: "São Paulo", lat: -23.4356, lon: -46.4731 },
    { name: "Buenos Aires", lat: -34.8222, lon: -58.5358 },
    { name: "Bogotá", lat: 4.7016, lon: -74.1469 },
    { name: "Arequipa", lat: -16.3409, lon: -71.5831 },
    
    // Europe
    { name: "London Heathrow", lat: 51.4700, lon: -0.4543 },
    { name: "Paris CDG", lat: 49.0097, lon: 2.5479 },
    { name: "Frankfurt", lat: 50.0379, lon: 8.5622 },
    { name: "Amsterdam", lat: 52.3105, lon: 4.7683 },
    { name: "Madrid", lat: 40.4983, lon: -3.5676 },
    { name: "Istanbul", lat: 40.9769, lon: 28.8146 },
    { name: "Moscow Sheremetyevo", lat: 55.9726, lon: 37.4146 },
    { name: "Reykjavik Iceland", lat: 64.1300, lon: -21.9406 },
    
    // Atlantic
    { name: "Atlantic Arcology", lat: 37.7412, lon: -25.6756 },
    
    // Middle East
    { name: "Dubai", lat: 25.2532, lon: 55.3657 },
    { name: "Doha", lat: 25.2731, lon: 51.6080 },
    
    // Africa
    { name: "Johannesburg", lat: -26.1392, lon: 28.2460 },
    { name: "Cairo", lat: 30.1219, lon: 31.4056 },
    { name: "Lagos", lat: 6.5774, lon: 3.3213 },
    { name: "Numbani", lat: 12.0022, lon: 8.5919 },
    
    // Asia
    { name: "Beijing", lat: 40.0799, lon: 116.6031 },
    { name: "Shanghai Pudong", lat: 31.1443, lon: 121.8083 },
    { name: "Hong Kong", lat: 22.3080, lon: 113.9185 },
    { name: "Tokyo Haneda", lat: 35.5494, lon: 139.7798 },
    { name: "Seoul Incheon", lat: 37.4602, lon: 126.4407 },
    { name: "Singapore", lat: 1.3644, lon: 103.9915 },
    { name: "Bangkok", lat: 13.6900, lon: 100.7501 },
    { name: "Delhi", lat: 28.5562, lon: 77.1000 },
    { name: "Mumbai", lat: 19.0896, lon: 72.8656 },
    
    // Oceania
    { name: "Sydney", lat: -33.9461, lon: 151.1772 },
    { name: "Melbourne", lat: -37.6690, lon: 144.8410 },
    { name: "Apia Samoa", lat: -13.8300, lon: -171.9993 }
];

// Seaports for maritime travel
const seaports = [
    // Original ports
    { name: "Houston", lat: 29.7350, lon: -95.2700 },
    { name: "Panama", lat: 9.1000, lon: -79.7000 },
    { name: "Suez", lat: 30.5000, lon: 32.3500 },
    { name: "Port Said", lat: 31.2653, lon: 32.3019 }, // Lower side of Suez entry
    { name: "Singapore", lat: 1.2644, lon: 103.8220 },
    { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
    
    // Florida & Caribbean
    { name: "Miami", lat: 25.7617, lon: -80.1918 },
    { name: "San Juan", lat: 18.4655, lon: -66.1057 }, // Puerto Rico
    { name: "Havana", lat: 23.1136, lon: -82.3666 }, // Cuba
    { name: "Port-au-Prince", lat: 18.5944, lon: -72.3074 }, // Haiti
    
    // Mexico
    { name: "Veracruz", lat: 19.1738, lon: -96.1342 },
    { name: "Manzanillo", lat: 19.0519, lon: -104.3153 }, // Pacific coast
    { name: "Acapulco", lat: 16.8531, lon: -99.8237 }, // Pacific coast
    
    // East Coast USA & Canada
    { name: "New York", lat: 40.6892, lon: -74.0445 },
    { name: "Halifax", lat: 44.6488, lon: -63.5752 }, // Canada
    { name: "Charleston", lat: 32.7765, lon: -79.9311 },
    
    // Colombia & Venezuela
    { name: "Cartagena", lat: 10.3910, lon: -75.5136 },
    { name: "La Guaira", lat: 10.6010, lon: -66.9344 }, // Caracas port
    
    // Guyana
    { name: "Georgetown", lat: 6.8013, lon: -58.1551 }, // Guyana
    
    // South America (between Caracas and Rio)
    { name: "Salvador", lat: -12.9714, lon: -38.5014 }, // Brazil
    { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
    { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
    
    // Kerguelen Islands
    { name: "Kerguelen", lat: -49.3500, lon: 70.2167 }, // Kerguelen Islands
    
    // Pacific Coast Americas
    { name: "Los Angeles", lat: 33.7405, lon: -118.2720 }, // USA Pacific
    { name: "San Francisco", lat: 37.7749, lon: -122.4194 }, // USA Pacific
    { name: "Seattle", lat: 47.6062, lon: -122.3321 }, // USA Pacific
    { name: "Vancouver", lat: 49.2827, lon: -123.1207 }, // Canada Pacific
    { name: "Guayaquil", lat: -2.1709, lon: -79.9224 }, // Ecuador Pacific
    { name: "Callao", lat: -12.0500, lon: -77.1500 }, // Peru Pacific
    { name: "Ilo", lat: -17.6394, lon: -71.3375 }, // Peru Pacific (lower/south Peru)
    { name: "Valparaiso", lat: -33.0472, lon: -71.6127 }, // Chile Pacific
    
    // Africa
    { name: "Casablanca", lat: 33.5731, lon: -7.5898 }, // Morocco
    { name: "Algiers", lat: 36.7538, lon: 3.0588 }, // Algeria
    { name: "Benghazi", lat: 32.1167, lon: 20.0667 }, // Libya
    { name: "Alexandria", lat: 31.2001, lon: 29.9187 }, // Egypt
    { name: "Jeddah", lat: 21.4858, lon: 39.1925 }, // Saudi Arabia
    { name: "Assab", lat: 13.0092, lon: 42.7394 }, // Eritrea
    { name: "Berbera", lat: 10.4340, lon: 45.0143 }, // Somalia
    { name: "Dakar", lat: 14.7167, lon: -17.4677 }, // Senegal
    { name: "Lagos", lat: 6.4474, lon: 3.3903 }, // Nigeria
    { name: "Durban", lat: -29.8579, lon: 31.0292 }, // South Africa
    { name: "Mombasa", lat: -4.0435, lon: 39.6682 }, // Kenya
    
    // Europe
    { name: "Barcelona", lat: 41.3851, lon: 2.1734 }, // Spain
    { name: "Genoa", lat: 44.4056, lon: 8.9463 }, // Italy
    { name: "Salerno", lat: 40.6824, lon: 14.7681 }, // Italy
    { name: "Catania", lat: 37.5079, lon: 15.0830 }, // Italy (Sicily)
    { name: "Gapolli", lat: 36.7606, lon: 22.5644 }, // Greece (Gythio/Gapolli area)
    { name: "Cyprus", lat: 35.1264, lon: 33.4299 }, // Cyprus (Nicosia area)
    { name: "Esperança", lat: 38.7223, lon: -9.1393 }, // Portugal (Lisbon area)
    { name: "La Rochelle", lat: 46.1603, lon: -1.1511 }, // France
    { name: "Cardiff", lat: 51.4816, lon: -3.1791 }, // Wales, UK
    { name: "Aberdeen", lat: 57.1497, lon: -2.0943 }, // Scotland, UK (north/east)
    { name: "Rotterdam", lat: 51.9244, lon: 4.4777 }, // Netherlands
    { name: "Bergen", lat: 60.3913, lon: 5.3221 }, // Norway (west coast)
    { name: "Novaya Zemlya", lat: 73.5000, lon: 56.0000 }, // Russia (Novaya Zemlya)
    { name: "Murmansk", lat: 68.9585, lon: 33.0827 }, // Russia (polar side)
    { name: "Hofn", lat: 64.2539, lon: -15.2083 }, // Iceland
    { name: "Atlantic Arcology", lat: 37.7412, lon: -25.6756 }, // Atlantic Arcology
    { name: "Gibraltar", lat: 36.1408, lon: -5.3536 }, // Gibraltar Strait
    
    // Asia
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 }, // India
    { name: "Chennai", lat: 13.0827, lon: 80.2707 }, // India
    { name: "Kolkata", lat: 22.5726, lon: 88.3639 }, // India
    { name: "Colombo", lat: 6.9271, lon: 79.8612 }, // Sri Lanka
    { name: "Socotra", lat: 12.4634, lon: 53.8237 }, // Yemen (Socotra Island)
    { name: "Muscat", lat: 23.5859, lon: 58.4059 }, // Oman
    { name: "Karachi", lat: 24.8607, lon: 67.0011 }, // Pakistan
    { name: "Shanghai", lat: 31.2304, lon: 121.4737 }, // China
    { name: "Hong Kong", lat: 22.3193, lon: 114.1694 }, // China
    { name: "Guangzhou", lat: 23.1291, lon: 113.2644 }, // China
    { name: "Qingdao", lat: 36.0671, lon: 120.3826 }, // China
    { name: "Busan", lat: 35.1028, lon: 129.0403 }, // South Korea
    { name: "Incheon", lat: 37.4563, lon: 126.7052 }, // South Korea
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 }, // Japan
    { name: "Yokohama", lat: 35.4437, lon: 139.6380 }, // Japan
    { name: "Osaka", lat: 34.6937, lon: 135.5023 }, // Japan
    { name: "Hokkaido", lat: 43.0642, lon: 141.3469 }, // Japan (Sapporo area)
    { name: "Jakarta", lat: -6.2088, lon: 106.8456 }, // Indonesia
    { name: "Surabaya", lat: -7.2575, lon: 112.7521 }, // Indonesia
    { name: "Manila", lat: 14.5995, lon: 120.9842 }, // Philippines
    { name: "Bangkok", lat: 13.7563, lon: 100.5018 }, // Thailand
    { name: "Ho Chi Minh City", lat: 10.8231, lon: 106.6297 }, // Vietnam
    
    // Oceania
    { name: "Sydney", lat: -33.8688, lon: 151.2093 }, // Australia
    { name: "Melbourne", lat: -37.8136, lon: 144.9631 }, // Australia
    { name: "Perth", lat: -31.9505, lon: 115.8605 }, // Australia
    { name: "Brisbane", lat: -27.4698, lon: 153.0251 }, // Australia
    { name: "Darwin", lat: -12.4634, lon: 130.8456 }, // Australia (north)
    { name: "Honolulu", lat: 21.3099, lon: -157.8581 }, // Hawaii, USA
    { name: "Hilo", lat: 19.7297, lon: -155.0900 }, // Hawaii, USA (Big Island)
    { name: "Auckland", lat: -36.8485, lon: 174.7633 }, // New Zealand
    { name: "Wellington", lat: -41.2865, lon: 174.7762 }, // New Zealand
    { name: "Suva", lat: -18.1248, lon: 178.4501 }, // Fiji
    { name: "Port Moresby", lat: -9.4438, lon: 147.1803 }, // Papua New Guinea
    { name: "Jayapura", lat: -2.5489, lon: 140.7181 }, // Indonesia (Papua, near PNG border)
    { name: "Noumea", lat: -22.2551, lon: 166.4508 }, // New Caledonia
    { name: "Port Vila", lat: -17.7333, lon: 168.3167 }, // Vanuatu
    { name: "Nadi", lat: -17.7533, lon: 177.4231 }, // Fiji (second port)
    { name: "Apia", lat: -13.8300, lon: -171.7667 }, // Samoa
    { name: "Nuku'alofa", lat: -21.1394, lon: -175.2018 }, // Tonga
    { name: "Pago Pago", lat: -14.2756, lon: -170.7020 }, // American Samoa
    { name: "Honiara", lat: -9.4281, lon: 159.9497 }, // Solomon Islands
    { name: "Madang", lat: -5.2217, lon: 145.7875 }, // Papua New Guinea (north)
    
    // Indo-Pacific Island Hopping
    { name: "Medan", lat: 3.5952, lon: 98.6722 }, // Indonesia (Sumatra)
    { name: "Padang", lat: -0.9492, lon: 100.3543 }, // Indonesia (Sumatra)
    { name: "Palembang", lat: -2.9761, lon: 104.7754 }, // Indonesia (Sumatra)
    { name: "Makassar", lat: -5.1477, lon: 119.4327 }, // Indonesia (Sulawesi)
    { name: "Balikpapan", lat: -1.2379, lon: 116.8529 }, // Indonesia (Borneo)
    { name: "Pontianak", lat: -0.0263, lon: 109.3425 }, // Indonesia (Borneo)
    { name: "Banda Aceh", lat: 5.5483, lon: 95.3238 }, // Indonesia (Sumatra)
    { name: "Cebu", lat: 10.3157, lon: 123.8854 }, // Philippines
    { name: "Davao", lat: 7.1907, lon: 125.4553 }, // Philippines
    { name: "Zamboanga", lat: 6.9214, lon: 122.0780 }, // Philippines
    { name: "Iloilo", lat: 10.7202, lon: 122.5621 }, // Philippines
    { name: "Penang", lat: 5.4164, lon: 100.3327 }, // Malaysia
    { name: "Phuket", lat: 7.8804, lon: 98.3923 }, // Thailand
    { name: "Yangon", lat: 16.8661, lon: 96.1951 }, // Myanmar
    { name: "Chittagong", lat: 22.3569, lon: 91.7832 }, // Bangladesh
    { name: "Vishakhapatnam", lat: 17.6868, lon: 83.2185 }, // India (east coast)
    
    // Alaska
    { name: "Anchorage", lat: 61.2181, lon: -149.9003 } // Alaska, USA
];

// Seaport connections (red lines)
const seaportConnections = [
    { from: "Houston", to: "Veracruz" },
    { from: "Houston", to: "Havana" },
    { from: "Houston", to: "Cartagena"}, // Houston to Cartagena
    { from: "Panama", to: "Cartagena" },
    { from: "Panama", to: "Port-au-Prince" },
    { from: "La Guaira", to: "San Juan" },
    { from: "Miami", to: "San Juan" },
    { from: "Charleston", to: "Miami" }, // Charleston to Miami
    { from: "San Juan", to: "New York" }, // San Juan to New York
    { from: "San Juan", to: "Halifax" }, // San Juan to Halifax
    { from: "San Juan", to: "Dakar" }, // San Juan to Dakar
    { from: "Rio de Janeiro", to: "Lagos" }, // Rio to Lagos
    
    // New York to Europe/Africa
    { from: "New York", to: "Cardiff" }, // New York to Wales (Cardiff)
    { from: "New York", to: "La Rochelle" }, // New York to France
    { from: "New York", to: "Casablanca" }, // New York to Morocco
    { from: "New York", to: "Esperança" }, // New York to Portugal
    
    // Gibraltar connections
    { from: "Gibraltar", to: "New York" },
    { from: "Gibraltar", to: "San Juan" },
    { from: "Gibraltar", to: "Miami" },
    
    // Guyana connections
    { from: "Georgetown", to: "San Juan" }, // Guyana to San Juan
    { from: "Georgetown", to: "Dakar" }, // Guyana to Senegal
    { from: "Georgetown", to: "Gibraltar" }, // Guyana to Gibraltar
    
    // Charleston connections
    { from: "Charleston", to: "Gibraltar" }, // Charleston to Gibraltar
    { from: "Charleston", to: "Dakar" }, // Charleston to Senegal
    
    // Cape Town connections
    { from: "Cape Town", to: "Salvador" }, // Cape Town to Salvador, Brazil
    { from: "Cape Town", to: "Rio de Janeiro" }, // Cape Town to Rio de Janeiro
    
    // Algiers connections
    { from: "Algiers", to: "Gibraltar" }, // Algiers to Gibraltar
    { from: "Algiers", to: "Genoa" }, // Algiers to Genoa
    { from: "Algiers", to: "Barcelona" }, // Algiers to Barcelona
    { from: "Algiers", to: "Salerno" }, // Algiers to Salerno
    
    // Benghazi connections
    { from: "Benghazi", to: "Barcelona" }, // Benghazi to Barcelona
    { from: "Benghazi", to: "Gapolli" }, // Benghazi to Gapolli
    { from: "Benghazi", to: "Catania" }, // Benghazi to Catania
    
    // Catania connections
    { from: "Catania", to: "Alexandria" }, // Catania to Alexandria
    
    // Alexandria connections
    { from: "Alexandria", to: "Cyprus" }, // Alexandria to Cyprus
    
    // Cyprus connections
    { from: "Cyprus", to: "Suez" }, // Cyprus to Suez
    
    // Jeddah connections
    { from: "Jeddah", to: "Suez" }, // Jeddah to Suez
    { from: "Jeddah", to: "Assab" }, // Jeddah to Assab (Eritrea)
    
    // Assab connections
    { from: "Assab", to: "Berbera" }, // Assab to Berbera (Somalia)
    
    // Berbera connections
    { from: "Berbera", to: "Socotra" }, // Berbera to Socotra
    
    // Socotra connections
    { from: "Socotra", to: "Mumbai" }, // Socotra to Mumbai
    
    // Mumbai connections
    { from: "Mumbai", to: "Muscat" }, // Mumbai to Oman
    { from: "Mumbai", to: "Karachi" }, // Mumbai to Pakistan
    
    // Sri Lanka and Kenya connection
    { from: "Colombo", to: "Mombasa" }, // Colombo (Sri Lanka) to Mombasa (Kenya)
    
    // Novaya Zemlya connections
    { from: "Novaya Zemlya", to: "Hofn" }, // Novaya Zemlya to Hofn
    { from: "Novaya Zemlya", to: "Murmansk" }, // Novaya Zemlya to Murmansk
    
    // Norway connections
    { from: "Bergen", to: "Hofn" }, // Bergen to Hofn
    { from: "Bergen", to: "Aberdeen" }, // Bergen to Scotland (north/east UK)
    { from: "Bergen", to: "Rotterdam" }, // Bergen to Netherlands
    
    // Hofn connections
    { from: "Hofn", to: "Dakar" }, // Hofn to Senegal
    { from: "Hofn", to: "Atlantic Arcology" }, // Hofn to Atlantic Arcology
    
    // Atlantic Arcology connections
    { from: "Atlantic Arcology", to: "Esperança" }, // Atlantic Arcology to Esperança
    { from: "Atlantic Arcology", to: "Georgetown" }, // Atlantic Arcology to Guyana
    { from: "Atlantic Arcology", to: "Miami" }, // Atlantic Arcology to Miami (American port to Gibraltar)
    { from: "Atlantic Arcology", to: "San Juan" }, // Atlantic Arcology to San Juan (American port to Gibraltar)
    { from: "Atlantic Arcology", to: "New York" }, // Atlantic Arcology to New York (American port to Gibraltar)
    
    // Durban and Perth connections
    { from: "Durban", to: "Perth" }, // Durban to Perth
    { from: "Perth", to: "Jakarta" }, // Perth to Jakarta
    
    // India to Southeast Asia
    { from: "Vishakhapatnam", to: "Phuket" }, // Vishakhapatnam to Phuket
    { from: "Vishakhapatnam", to: "Yangon" }, // Vishakhapatnam to Yangon
    
    // Southeast Asia island hopping
    { from: "Ho Chi Minh City", to: "Pontianak" }, // Ho Chi Minh City to Pontianak
    { from: "Pontianak", to: "Surabaya" }, // Pontianak to Surabaya
    { from: "Surabaya", to: "Makassar" }, // Surabaya to Makassar
    { from: "Pontianak", to: "Singapore" }, // Pontianak to Singapore
    
    // Philippines connections
    { from: "Manila", to: "Hong Kong" }, // Manila to Hong Kong
    { from: "Manila", to: "Zamboanga" }, // Manila to Zamboanga
    { from: "Zamboanga", to: "Makassar" }, // Zamboanga to Makassar
    
    // East Asia connections
    { from: "Shanghai", to: "Busan" }, // Shanghai to Busan
    { from: "Busan", to: "Osaka" }, // Busan to Osaka
    
    // Pacific island connections
    { from: "Apia", to: "Tokyo" }, // Apia to Tokyo
    { from: "Apia", to: "Honiara" }, // Apia to Honiara
    { from: "Port Vila", to: "Honiara" }, // Port Vila to Honiara
    
    // Oceania connections
    { from: "Noumea", to: "Sydney" }, // Noumea to Sydney
    { from: "Sydney", to: "Auckland" }, // Sydney to Auckland
    
    // Pacific routes
    { from: "Tokyo", to: "Honolulu" }, // Tokyo to Hawaii
    { from: "Apia", to: "Honolulu" }, // Apia to Hawaii
    { from: "Honolulu", to: "San Francisco" }, // Hawaii to San Francisco
    { from: "Honolulu", to: "Vancouver" }, // Hawaii to Vancouver
    { from: "Honolulu", to: "Anchorage" }, // Hawaii to Alaska
    
    // Buenos Aires to Kerguelen
    { from: "Buenos Aires", to: "Kerguelen" }, // Buenos Aires to Kerguelen
    
    // Kerguelen connections
    { from: "Kerguelen", to: "Perth" }, // Kerguelen to Perth
    { from: "Kerguelen", to: "Cape Town" }, // Kerguelen to Cape Town
    { from: "Kerguelen", to: "Durban" }, // Kerguelen to Durban
    
    // Oceania/Pacific connections
    { from: "Auckland", to: "Nuku'alofa" }, // Auckland to Nuku'alofa
    { from: "Nuku'alofa", to: "Apia" }, // Nuku'alofa to Apia
    { from: "Auckland", to: "Port Vila" }, // Auckland to Port Vila
    { from: "Auckland", to: "Noumea" }, // Auckland to Noumea
    
    // Pacific Americas routes
    { from: "Honolulu", to: "Acapulco" }, // Hawaii to Acapulco
    { from: "Acapulco", to: "Guayaquil" }, // Acapulco to Guayaquil
    { from: "Valparaiso", to: "Auckland" }, // Valparaiso to Auckland
    { from: "Valparaiso", to: "Apia" }, // Valparaiso to Apia
    
    // Additional Pacific connections
    { from: "Guayaquil", to: "Panama" }, // Guayaquil to Panama
    { from: "Zamboanga", to: "Darwin" }, // Zamboanga to Darwin
    { from: "Darwin", to: "Port Moresby" }, // Darwin to Port Moresby
    { from: "Port Moresby", to: "Noumea" }, // Port Moresby to Noumea
    
    // Sri Lanka and Africa connections
    { from: "Colombo", to: "Kerguelen" }, // Sri Lanka to Kerguelen
    { from: "Mombasa", to: "Perth" }, // Mombasa to Perth
    
    // Jayapura connections
    { from: "Jayapura", to: "Tokyo" }, // Jayapura to Tokyo
    { from: "Jayapura", to: "Shanghai" }, // Jayapura to Shanghai
    
    // Lower Peru to Hawaii
    { from: "Ilo", to: "Honolulu" } // Lower Peru to Hawaii
];

// Filter out ports with 0 connections
(function() {
    // Count connections for each port
    const connectionCounts = {};
    seaports.forEach(port => {
        connectionCounts[port.name] = 0;
    });
    
    // Count connections (both from and to)
    seaportConnections.forEach(conn => {
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
            console.log(`Removing port with 0 connections: ${portName}`);
        }
    });
    
    // Filter seaports array (create new array since const can't be reassigned)
    const filteredSeaports = seaports.filter(port => !portsToRemove.has(port.name));
    
    // Filter seaportConnections to remove any connections referencing deleted ports
    const filteredConnections = seaportConnections.filter(conn => 
        !portsToRemove.has(conn.from) && !portsToRemove.has(conn.to)
    );
    
    // Replace the arrays (we'll need to modify the code to use these filtered arrays)
    // Since we can't reassign const, we'll clear and repopulate
    seaports.length = 0;
    seaports.push(...filteredSeaports);
    
    seaportConnections.length = 0;
    seaportConnections.push(...filteredConnections);
    
    console.log(`Filtered seaports: ${seaports.length} ports remaining (removed ${portsToRemove.size})`);
})();

// Plane arrays
let planes = [];
let planeTrails = []; // Independent trail segments that fade over time

// Boat arrays
let boats = [];
let boatTrails = []; // Boat trail segments (delta/triangle shape)
let boatRouteCurves = []; // Store all boat route curves
let boatRouteGraph = {}; // Graph of port connections for multi-stop routes
let boatRouteReservations = {}; // Track which routes are currently in use

// GLTF Loader for 3D models
let gltfLoader = null;
let planeModelCache = null; // Cache the loaded plane model

function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container) return;
    
    // Initialize GLTF Loader
    gltfLoader = new THREE.GLTFLoader();

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1929);

    // Camera setup
    camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 3.5; // Zoomed out to see full globe

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Create Earth sphere
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Load Earth texture
    const textureLoader = new THREE.TextureLoader();
    
    // Using local Earth texture
    const earthTexture = textureLoader.load(
        'MAP.png',
        function(texture) {
            console.log('Earth texture loaded successfully');
            
            // Improve texture quality and reduce pole blur
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Max quality
            texture.minFilter = THREE.LinearFilter; // Reduce blur when zoomed out
            texture.magFilter = THREE.LinearFilter; // Reduce blur when zoomed in
            texture.generateMipmaps = false; // Disable mipmaps to reduce blur
            
            globe.material.needsUpdate = true;
            animate(); // Start animation once texture is loaded
        },
        undefined,
        function(err) {
            console.error('Error loading Earth texture:', err);
            // Fallback to simple blue sphere
            globe.material.color.setHex(0x4a90e2);
        }
    );
    
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: earthTexture, // Use same texture for depth
        bumpScale: 0.005, // Subtle relief to avoid pixelation
        shininess: 10,
        flatShading: false
    });
    
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Add starfield background
    addStarfield();

    // Add city markers
    addCityMarkers();
    
    // Add seaport markers
    addSeaportMarkers();
    
    // Add seaport connection lines (red)
    addSeaportConnectionLines();
    
    // Add connection lines
    addConnectionLines();
    
    // Add secondary connection lines
    addSecondaryConnectionLines();

    // Mouse/Touch controls
    setupControls(container);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Optional: Uncomment to add grid lines
    // addGridLines();
    
    // Start spawning transport systems
    spawnTrainsRandomly();
    spawnPlanesRandomly();
    spawnBoatsRandomly();
}

// Calculate route distance (approximate arc length)
function calculateRouteDistance(curve) {
    const points = curve.getPoints(50);
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
        distance += points[i].distanceTo(points[i - 1]);
    }
    return distance;
}

// Calculate color based on journey progress (red -> green gradient)
function getTrainColor(progress) {
    // progress: 0 = red, 1 = green
    const red = Math.round(255 * (1 - progress));
    const green = Math.round(200 * progress + 55); // Start at 55 to avoid pure red
    const blue = 51; // Constant low blue
    
    return (red << 16) | (green << 8) | blue;
}

// Create a train with wagons
function createTrain(routeData, isMultiStop = false, journeyProgress = 0) {
    // Calculate route distance to determine max wagons
    const routeDistance = calculateRouteDistance(routeData.curve);
    
    // Determine number of wagons based on distance
    // Short routes (< 0.5): max 2 wagons
    // Medium routes (0.5 - 1.0): max 4 wagons
    // Long routes (> 1.0): max 6 wagons
    let maxWagons;
    if (routeDistance < 0.5) {
        maxWagons = 2;
    } else if (routeDistance < 1.0) {
        maxWagons = 4;
    } else {
        maxWagons = 6;
    }
    
    // More likely to have multiple wagons (70% chance of 3+ wagons)
    const rand = Math.random();
    let numWagons;
    if (rand < 0.7) {
        // 70% chance: 3 to maxWagons
        numWagons = Math.floor(Math.random() * (maxWagons - 2)) + 3;
    } else {
        // 30% chance: 2 wagons
        numWagons = 2;
    }
    numWagons = Math.min(numWagons, maxWagons);
    
    // Create rectangular wagon geometry (elongated)
    // Length along Z-axis so it aligns with forward direction
    const wagonWidth = 0.015;   // X-axis
    const wagonHeight = 0.012;  // Y-axis  
    const wagonLength = 0.028;  // Z-axis (longest side, parallel to track) - shorter
    
    // Wagon body material - all trains use regular blue for now
    // Multi-stop gradient code kept for future use (commented out)
    let bodyColor, emissiveColor, windowColor, windowEmissive;
    
    // Always use regular blue color
    bodyColor = 0x0088cc;
    emissiveColor = 0x0055aa;
    windowColor = 0x004488;
    windowEmissive = 0x002255;
    
    /* COLOR GRADIENT CODE (DISABLED) - Uncomment to enable multi-stop color transitions
    if (isMultiStop) {
        bodyColor = getTrainColor(journeyProgress);
        // Calculate darker emissive
        const r = (bodyColor >> 16) & 0xff;
        const g = (bodyColor >> 8) & 0xff;
        const b = bodyColor & 0xff;
        emissiveColor = ((r * 0.6) << 16) | ((g * 0.6) << 8) | (b * 0.6);
        
        // Windows darker than body
        windowColor = ((r * 0.5) << 16) | ((g * 0.5) << 8) | (b * 0.5);
        windowEmissive = ((r * 0.3) << 16) | ((g * 0.3) << 8) | (b * 0.3);
    } else {
        bodyColor = 0x0088cc;
        emissiveColor = 0x0055aa;
        windowColor = 0x004488;
        windowEmissive = 0x002255;
    }
    */
    
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: bodyColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.5,
        depthTest: true,
        depthWrite: true,
        shininess: 30
    });
    
    const windowMaterial = new THREE.MeshPhongMaterial({
        color: windowColor,
        emissive: windowEmissive,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.6,
        shininess: 50
    });
    
    // Create wagon group
    const trainGroup = new THREE.Group();
    const wagons = [];
    
    for (let i = 0; i < numWagons; i++) {
        // Create wagon body with beveled edges
        const wagonGroup = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(wagonWidth * 0.9, wagonHeight * 0.85, wagonLength * 0.95);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial.clone());
        wagonGroup.add(body);
        
        // Beveled edges (smaller boxes at corners)
        const bevelSize = 0.001;
        const bevelGeometry = new THREE.BoxGeometry(wagonWidth, wagonHeight, wagonLength);
        const bevel = new THREE.Mesh(bevelGeometry, bodyMaterial.clone());
        bevel.scale.set(0.95, 0.95, 0.98);
        wagonGroup.add(bevel);
        
        // Add outer glow layer - always blue for now
        const glowColor = 0x0088cc;
        const glowEmissive = 0x0099ff;
        
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: glowColor,
            emissive: glowEmissive,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.25,
            depthTest: true,
            depthWrite: false,
            shininess: 100
        });
        const glowGeometry = new THREE.BoxGeometry(wagonWidth * 1.15, wagonHeight * 1.15, wagonLength * 1.05);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        wagonGroup.add(glow);
        
        // Side windows (pair on each side)
        const windowWidth = 0.003;
        const windowHeight = 0.004;
        const windowLength = 0.006;
        const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowLength);
        
        // Left side windows
        const leftWindow1 = new THREE.Mesh(windowGeometry, windowMaterial.clone());
        leftWindow1.position.set(-wagonWidth * 0.5, 0, wagonLength * 0.15);
        wagonGroup.add(leftWindow1);
        
        const leftWindow2 = new THREE.Mesh(windowGeometry, windowMaterial.clone());
        leftWindow2.position.set(-wagonWidth * 0.5, 0, -wagonLength * 0.15);
        wagonGroup.add(leftWindow2);
        
        // Right side windows
        const rightWindow1 = new THREE.Mesh(windowGeometry, windowMaterial.clone());
        rightWindow1.position.set(wagonWidth * 0.5, 0, wagonLength * 0.15);
        wagonGroup.add(rightWindow1);
        
        const rightWindow2 = new THREE.Mesh(windowGeometry, windowMaterial.clone());
        rightWindow2.position.set(wagonWidth * 0.5, 0, -wagonLength * 0.15);
        wagonGroup.add(rightWindow2);
        
        // Connector pieces (small squares, window color)
        const connectorSize = 0.004;
        const connectorGeometry = new THREE.BoxGeometry(connectorSize, connectorSize, windowWidth * 1.5);
        
        // First wagon: front window + back connector
        if (i === 0) {
            // Front window - larger and more prominent
            const frontWindowGeometry = new THREE.BoxGeometry(wagonWidth * 0.8, windowHeight * 1.5, windowWidth * 2);
            const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial.clone());
            frontWindow.position.set(0, windowHeight * 0.3, -wagonLength * 0.52); // Front (negative Z)
            frontWindow.renderOrder = 1000; // Render on top
            wagonGroup.add(frontWindow);
            
            // Back connector
            const backConnector = new THREE.Mesh(connectorGeometry, windowMaterial.clone());
            backConnector.position.set(0, 0, wagonLength * 0.52); // Back (positive Z)
            wagonGroup.add(backConnector);
        }
        // Last wagon: back window + front connector
        else if (i === numWagons - 1) {
            // Back window - larger and more prominent
            const backWindowGeometry = new THREE.BoxGeometry(wagonWidth * 0.8, windowHeight * 1.5, windowWidth * 2);
            const backWindow = new THREE.Mesh(backWindowGeometry, windowMaterial.clone());
            backWindow.position.set(0, windowHeight * 0.3, wagonLength * 0.52); // Back (positive Z)
            backWindow.renderOrder = 1000; // Render on top
            wagonGroup.add(backWindow);
            
            // Front connector
            const frontConnector = new THREE.Mesh(connectorGeometry, windowMaterial.clone());
            frontConnector.position.set(0, 0, -wagonLength * 0.52); // Front (negative Z)
            wagonGroup.add(frontConnector);
        }
        // Middle wagons: connectors on both ends
        else {
            // Front connector
            const frontConnector = new THREE.Mesh(connectorGeometry, windowMaterial.clone());
            frontConnector.position.set(0, 0, -wagonLength * 0.52); // Front (negative Z)
            wagonGroup.add(frontConnector);
            
            // Back connector
            const backConnector = new THREE.Mesh(connectorGeometry, windowMaterial.clone());
            backConnector.position.set(0, 0, wagonLength * 0.52); // Back (positive Z)
            wagonGroup.add(backConnector);
        }
        
        wagonGroup.renderOrder = 999; // Render trains on top of everything else
        wagonGroup.visible = false; // Start hidden, will be shown when positioned correctly
        
        // SAFETY: Start wagon at Earth's center (0,0,0) so it's hidden inside until properly positioned
        wagonGroup.position.set(0, 0, 0);
        
        trainGroup.add(wagonGroup);
        wagons.push(wagonGroup);
    }
    
    // Calculate speed based on distance - balanced for visibility
    let baseSpeed;
    if (routeDistance < 0.5) {
        baseSpeed = 0.006; // Short routes - fast
    } else if (routeDistance < 1.0) {
        baseSpeed = 0.005; // Medium routes - moderate
    } else {
        baseSpeed = 0.004; // Long routes - slower for visibility
    }
    const speed = baseSpeed + Math.random() * 0.002;
    
    // Store animation data
    trainGroup.userData = {
        curve: routeData.curve,
        progress: 0,
        speed: speed, // Distance-based hyperloop speed
        from: routeData.from,
        to: routeData.to,
        wagons: wagons,
        wagonSpacing: 0.035, // Distance between wagons along curve (balanced spacing)
        isMultiStop: false,
        routes: null,
        currentRouteIndex: 0,
        needsReverse: false,
        isTransitioning: false,
        trainId: Math.random().toString(36).substr(2, 9),
        isWaiting: false,
        journeyProgress: journeyProgress
    };
    
    // Reserve the route for single-stop trains
    if (!isMultiStop) {
        reserveRoute(routeData.from, routeData.to, trainGroup.userData.trainId);
    }
    
    // Position at start of curve
    const startPos = routeData.curve.getPointAt(0);
    trainGroup.position.copy(startPos);
    
    // Ensure train is completely invisible until first proper update
    trainGroup.visible = false;
    
    // Mark as newly spawned - will be updated before first render
    trainGroup.userData.isNewlySpawned = true;
    
    globe.add(trainGroup);
    trains.push(trainGroup);
    
    return trainGroup;
}

// Get unique route key for reservation system
function getRouteKey(from, to) {
    // Sort cities alphabetically to get consistent key regardless of direction
    return [from, to].sort().join('-');
}

// Check if a route is available (not in use)
function isRouteAvailable(from, to) {
    const key = getRouteKey(from, to);
    return !routeReservations[key];
}

// Reserve a route for a train
function reserveRoute(from, to, trainId) {
    const key = getRouteKey(from, to);
    routeReservations[key] = trainId;
}

// Release a route reservation
function releaseRoute(from, to, trainId) {
    const key = getRouteKey(from, to);
    if (routeReservations[key] === trainId) {
        delete routeReservations[key];
    }
}

// Create a trail segment that fades over time
function createTrailSegment(position, direction) {
    // Calculate position behind the plane (back of the plane)
    const trailOffset = 0.015; // Distance behind plane
    const backPosition = position.clone().add(direction.clone().multiplyScalar(trailOffset));
    
    const segmentGeometry = new THREE.SphereGeometry(0.004, 6, 6);
    const segmentMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    segment.position.copy(backPosition);
    
    segment.userData = {
        age: 0, // How long this segment has existed
        maxAge: 180 // Frames before fully faded (3 seconds at 60fps)
    };
    
    globe.add(segment);
    planeTrails.push(segment);
}

// Update all trail segments (fade and remove old ones)
function updateTrailSegments() {
    for (let i = planeTrails.length - 1; i >= 0; i--) {
        const trail = planeTrails[i];
        trail.userData.age += 1;
        
        // Fade out over time
        const fadeProgress = trail.userData.age / trail.userData.maxAge;
        trail.material.opacity = 0.8 * (1 - fadeProgress);
        
        // Remove when fully faded
        if (trail.userData.age >= trail.userData.maxAge) {
            globe.remove(trail);
            planeTrails.splice(i, 1);
        }
        
        // Hide if transport toggle is off
        trail.visible = hyperloopVisible;
    }
}

// Create a delta/triangle trail segment for boats
function createBoatTrailSegment(position, forward, right, up) {
    // Create a triangle shape pointing forward (delta shape)
    const triangleSize = 0.006; // Triangle size (reverted to original)
    const triangleGeometry = new THREE.BufferGeometry();
    
    // Triangle vertices: point forward, two points behind forming a V
    const vertices = new Float32Array([
        // Front point (tip of delta)
        position.x + forward.x * triangleSize * 1.5,
        position.y + forward.y * triangleSize * 1.5,
        position.z + forward.z * triangleSize * 1.5,
        // Left back point
        position.x - forward.x * triangleSize * 0.5 + right.x * triangleSize,
        position.y - forward.y * triangleSize * 0.5 + right.y * triangleSize,
        position.z - forward.z * triangleSize * 0.5 + right.z * triangleSize,
        // Right back point
        position.x - forward.x * triangleSize * 0.5 - right.x * triangleSize,
        position.y - forward.y * triangleSize * 0.5 - right.y * triangleSize,
        position.z - forward.z * triangleSize * 0.5 - right.z * triangleSize
    ]);
    
    triangleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    triangleGeometry.setIndex([0, 1, 2]); // Triangle indices
    
    const triangleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // White color for boat trails
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    
    triangle.userData = {
        age: 0,
        maxAge: 45 // Frames before fully faded (0.75 seconds at 60fps - much faster fade)
    };
    
    // Set initial visibility based on toggle state
    triangle.visible = hyperloopVisible;
    
    globe.add(triangle);
    boatTrails.push(triangle);
}

// Update all boat trail segments (fade and remove old ones)
function updateBoatTrailSegments() {
    for (let i = boatTrails.length - 1; i >= 0; i--) {
        const trail = boatTrails[i];
        trail.userData.age += 1;
        
        // Fade out over time (faster fade, especially for longer trails)
        const fadeProgress = trail.userData.age / trail.userData.maxAge;
        // Use exponential fade for faster disappearance
        const fadeFactor = Math.pow(fadeProgress, 1.5); // Exponential fade curve
        trail.material.opacity = 0.6 * (1 - fadeFactor);
        
        // Remove when fully faded
        if (trail.userData.age >= trail.userData.maxAge) {
            globe.remove(trail);
            boatTrails.splice(i, 1);
        }
        
        // Hide if transport toggle is off
        trail.visible = hyperloopVisible;
    }
}

// Create a plane model (single unit) - loads from GLB
function createPlane(fromCity, toCity) {
    // Create flight path with takeoff and landing
    const groundStart = latLonToVector3(fromCity.lat, fromCity.lon, 1.005); // Start on ground
    const groundEnd = latLonToVector3(toCity.lat, toCity.lon, 1.005); // End on ground
    
    // Calculate distance for appropriate cruise altitude
    const distance = groundStart.distanceTo(groundEnd);
    
    // Scale cruise altitude based on distance (shorter flights = lower altitude, but always above trains)
    // MUCH FLATTER paths - barely above the trains
    // Short flights (~0.3 units): 1.04 altitude
    // Medium flights (~0.8 units): 1.06 altitude  
    // Long flights (1.5+ units): 1.08 altitude
    const minAltitude = 1.04; // Minimum cruise altitude (barely above hyperloop's 1.03)
    const maxAltitude = 1.08; // Maximum cruise altitude for long flights (much lower)
    const normalizedDistance = Math.min(distance / 1.5, 1.0); // Normalize distance (1.5 = very long)
    const cruiseAltitude = minAltitude + (maxAltitude - minAltitude) * normalizedDistance;
    
    // Scale takeoff/landing phases based on distance (longer flights = shorter relative phases)
    // Short flights: 25% takeoff, 50% landing
    // Long flights: 20% takeoff, 40% landing
    const takeoffPhase = 0.25 - (normalizedDistance * 0.05); // 0.25 to 0.20
    const landingPhase = 0.50 - (normalizedDistance * 0.10); // 0.50 to 0.40
    const cruiseStart = takeoffPhase;
    const cruiseEnd = 1.0 - landingPhase;
    
    // Create flight path points with takeoff and landing phases
    const flightPoints = [];
    const totalSegments = 60;
    
    for (let i = 0; i <= totalSegments; i++) {
        const t = i / totalSegments;
        
        // Get base position along great circle
        const basePoint = createArcBetweenPoints(
            fromCity.lat, fromCity.lon,
            toCity.lat, toCity.lon,
            1.005, // Ground level
            totalSegments,
            true
        )[i];
        
        // Calculate altitude based on flight phase
        let altitude;
        if (t < cruiseStart) {
            // Takeoff phase: very gradual curve from ground to cruise for parallel takeoff
            const takeoffProgress = t / cruiseStart;
            const easeOut = Math.sin(takeoffProgress * Math.PI / 2); // Gentle sine ease-out
            altitude = 1.005 + (cruiseAltitude - 1.005) * easeOut;
        } else if (t > cruiseEnd) {
            // Landing phase: extended gradual curve from cruise to ground for very parallel landing
            const landingProgress = (t - cruiseEnd) / (1.0 - cruiseEnd);
            // Use a custom curve that's very gentle (quadratic ease)
            const easeIn = landingProgress * landingProgress;
            altitude = cruiseAltitude - (cruiseAltitude - 1.005) * easeIn;
        } else {
            // Cruise phase: maintain altitude
            altitude = cruiseAltitude;
        }
        
        // Scale position to new altitude
        const normalizedPos = basePoint.clone().normalize();
        flightPoints.push(normalizedPos.multiplyScalar(altitude));
    }
    
    const curve = new THREE.CatmullRomCurve3(flightPoints);
    
    // Planes move faster than trains
    const speed = distance > 1.5 ? 0.0015 : 0.0020; // Faster for planes
    
    const planeGroup = new THREE.Group();
    
    // Load or clone the plane model
    if (planeModelCache) {
        // Clone the cached model for better performance
        const planeModel = planeModelCache.clone();
        
        // Adjust scale if needed (you can tweak these values)
        planeModel.scale.set(0.02, 0.02, 0.02);
        
        // Make sure it's visible
        planeModel.visible = true;
        
        // Apply train blue color to all meshes
        planeModel.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshPhongMaterial({
                    color: 0x0088cc, // Train blue
                    emissive: 0x004488,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.85,
                    shininess: 30
                });
                child.visible = true;
            }
        });
        
        planeGroup.add(planeModel);
        console.log('✈️ Cloned plane model added');
    } else {
        // Load the model for the first time
        console.log('📦 Loading Plane.glb for first time...');
        gltfLoader.load('Plane.glb', (gltf) => {
            console.log('✅ Plane.glb loaded successfully!', gltf);
            const model = gltf.scene;
            
            // Cache for future planes
            planeModelCache = model.clone();
            
            // Adjust scale
            model.scale.set(0.02, 0.02, 0.02);
            
            // Make sure it's visible
            model.visible = true;
            
            // Apply train blue color to all meshes
            model.traverse((child) => {
                if (child.isMesh) {
                    console.log('Found mesh in model:', child.name);
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0x0088cc, // Train blue
                        emissive: 0x004488,
                        emissiveIntensity: 0.3,
                        transparent: true,
                        opacity: 0.85,
                        shininess: 30
                    });
                    child.visible = true;
                    // Compute bounding boxes
                    if (child.geometry) {
                        child.geometry.computeBoundingBox();
                        child.geometry.computeBoundingSphere();
                    }
                }
            });
            
            planeGroup.add(model);
        }, 
        (xhr) => {
            console.log('Loading plane: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('❌ Error loading plane model:', error);
        });
    }
    
    // Store metadata
    planeGroup.userData = {
        curve: curve,
        progress: 0,
        speed: speed,
        from: fromCity.name,
        to: toCity.name,
        isPlane: true,
        lastTrailSpawn: 0, // Timer for spawning trail segments
        trailSpawnInterval: 2, // Spawn every 2 frames for more continuous trail
        landingTimer: 0, // Timer for how long plane stays on ground
        hasLanded: false, // Whether plane has landed
        bankAngle: 0, // Current bank/roll angle
        targetBankAngle: 0, // Target bank angle for smooth transitions
        bankChangeTimer: 0 // Timer for changing bank angle
    };
    
    planeGroup.visible = false; // Start invisible
    globe.add(planeGroup);
    planes.push(planeGroup);
    
    return planeGroup;
}

// Build route graph for multi-stop pathfinding
function buildRouteGraph() {
    routeGraph = {};
    
    // Build graph from all connections
    routeCurves.forEach(routeData => {
        // Add bidirectional connections
        if (!routeGraph[routeData.from]) routeGraph[routeData.from] = [];
        if (!routeGraph[routeData.to]) routeGraph[routeData.to] = [];
        
        routeGraph[routeData.from].push({ city: routeData.to, routeData: routeData });
        routeGraph[routeData.to].push({ city: routeData.from, routeData: routeData });
    });
}

// Find alternate route from current city to destination (excluding previous city)
function findAlternateRoute(fromCity, toCity, previousCity, maxHops = 5) {
    // BFS to find available alternate path
    const queue = [{ city: fromCity, path: [fromCity], routes: [] }];
    const visited = new Set([fromCity]);
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Found destination
        if (current.city === toCity && current.routes.length > 0 && current.routes.length <= maxHops) {
            return current.routes;
        }
        
        // Don't go deeper than maxHops
        if (current.routes.length >= maxHops) continue;
        
        // Explore neighbors
        const neighbors = routeGraph[current.city] || [];
        for (const neighbor of neighbors) {
            // Skip if going back to previous city
            if (neighbor.city === previousCity) continue;
            
            // Skip if already visited
            if (visited.has(neighbor.city)) continue;
            
            // Skip if route is in use
            if (!isRouteAvailable(current.city, neighbor.city)) continue;
            
            visited.add(neighbor.city);
            
            const orientedRoute = {
                curve: neighbor.routeData.curve,
                from: current.city,
                to: neighbor.city,
                isMainRoute: neighbor.routeData.isMainRoute,
                needsReverse: neighbor.routeData.from !== current.city
            };
            
            queue.push({
                city: neighbor.city,
                path: [...current.path, neighbor.city],
                routes: [...current.routes, orientedRoute]
            });
        }
    }
    
    return null; // No alternate route found
}

// Find a multi-stop route (BFS with max depth) - only uses available routes
function findMultiStopRoute(maxStops) {
    const allCities = Object.keys(routeGraph);
    if (allCities.length < 2) return null;
    
    // Weighted city selection - favor Aatlis and Midtown
    function selectWeightedCity() {
        const rand = Math.random();
        
        // 35% chance for Aatlis (highest bias)
        if (rand < 0.35 && allCities.includes('Aatlis')) {
            return 'Aatlis';
        }
        // 20% chance for Midtown (medium bias)
        else if (rand < 0.55 && allCities.includes('Midtown')) {
            return 'Midtown';
        }
        // 45% chance for any other city
        else {
            return allCities[Math.floor(Math.random() * allCities.length)];
        }
    }
    
    // Pick weighted start city
    const startCity = selectWeightedCity();
    
    // BFS to find paths
    const queue = [{ city: startCity, path: [startCity], routes: [] }];
    const validPaths = [];
    const visited = new Set();
    
    while (queue.length > 0 && validPaths.length < 30) {
        const current = queue.shift();
        
        // Only save paths with at least 2 routes (3 cities minimum)
        if (current.routes.length >= 2 && current.path.length <= maxStops + 1) {
            validPaths.push(current);
        }
        
        // Don't go deeper than maxStops + 1 cities
        if (current.path.length > maxStops + 1) continue;
        
        // Explore neighbors
        const neighbors = routeGraph[current.city] || [];
        for (const neighbor of neighbors) {
            // Don't revisit cities
            if (current.path.includes(neighbor.city)) continue;
            
            const pathKey = [...current.path, neighbor.city].join('-');
            if (visited.has(pathKey)) continue;
            visited.add(pathKey);
            
            // Check if route is available
            if (!isRouteAvailable(current.city, neighbor.city)) continue;
            
            // Create a properly oriented route segment
            const orientedRoute = {
                curve: neighbor.routeData.curve,
                from: current.city,
                to: neighbor.city,
                isMainRoute: neighbor.routeData.isMainRoute,
                needsReverse: neighbor.routeData.from !== current.city
            };
            
            queue.push({
                city: neighbor.city,
                path: [...current.path, neighbor.city],
                routes: [...current.routes, orientedRoute]
            });
        }
    }
    
    // Return random valid path
    console.log(`findMultiStopRoute: Found ${validPaths.length} valid paths (requested ${maxStops} stops)`);
    if (validPaths.length === 0) return null;
    return validPaths[Math.floor(Math.random() * validPaths.length)];
}

// Spawn trains at random intervals
function spawnTrainsRandomly() {
    // Build route graph for multi-stop routes
    buildRouteGraph();
    
    // Train system initialized
    console.log(`📊 Total routes: ${routeCurves.length}`);
    console.log(`📊 Cities in graph: ${Object.keys(routeGraph).length}`);
    
    // Spawn initial train
    if (routeCurves.length > 0) {
        const randomRoute = routeCurves[Math.floor(Math.random() * routeCurves.length)];
        createTrain(randomRoute);
    }
    
    // Continue spawning trains randomly - only when page is visible and hyperloop is enabled
    trainSpawnInterval = setInterval(() => {
        // Only spawn trains if page is visible and hyperloop system is enabled
        if (!isPageVisible || !hyperloopVisible) return;
        
        if (routeCurves.length > 0) {
            // 33% chance for multi-stop train (half as common as single-stop)
            const isMultiStop = Math.random() < 0.33;
            
            if (isMultiStop && Object.keys(routeGraph).length > 0) {
                // Create multi-stop train (2-4 stops minimum)
                const numStops = Math.floor(Math.random() * 3) + 2; // 2-4 stops
                const multiRoute = findMultiStopRoute(numStops);
                
                console.log(`Attempting multi-stop train, found route:`, multiRoute ? `${multiRoute.routes.length} segments` : 'NULL');
                
                // Only create if we have at least 2 route segments
                if (multiRoute && multiRoute.routes.length >= 2) {
                    console.log(`✅ Creating multi-stop train with ${multiRoute.routes.length} segments`);
                    createMultiStopTrain(multiRoute.routes);
                } else {
                    console.log(`❌ Failed to find valid multi-stop route, creating single-stop instead`);
                    // Fallback to single route
                    const randomRoute = routeCurves[Math.floor(Math.random() * routeCurves.length)];
                    createTrain(randomRoute);
                }
            } else {
                // Single route train - weighted towards Aatlis and Midtown
                let selectedRoute;
                const rand = Math.random();
                
                // 30% chance to pick route involving Aatlis
                if (rand < 0.30) {
                    const aatlisRoutes = routeCurves.filter(r => r.from === 'Aatlis' || r.to === 'Aatlis');
                    if (aatlisRoutes.length > 0) {
                        selectedRoute = aatlisRoutes[Math.floor(Math.random() * aatlisRoutes.length)];
                    }
                }
                // 15% chance to pick route involving Midtown
                else if (rand < 0.45) {
                    const midtownRoutes = routeCurves.filter(r => r.from === 'Midtown' || r.to === 'Midtown');
                    if (midtownRoutes.length > 0) {
                        selectedRoute = midtownRoutes[Math.floor(Math.random() * midtownRoutes.length)];
                    }
                }
                
                // If no weighted route selected, pick random (55% chance or fallback)
                if (!selectedRoute) {
                    selectedRoute = routeCurves[Math.floor(Math.random() * routeCurves.length)];
                }
                
                createTrain(selectedRoute);
            }
        }
    }, 1000); // Spawn a new train every 1 second
}

// Spawn planes randomly (long-distance routes only)
function spawnPlanesRandomly() {
    // Plane system initialized
    console.log(`📊 Total airports: ${airports.length}`);
    
    // Calculate minimum distance (Seattle to LA as reference ~1500km = ~0.4 units)
    const minDistance = 0.4;
    
    // Spawn planes every 3 seconds
    setInterval(() => {
        if (!isPageVisible || !hyperloopVisible) return;
        
        // Pick two random airports
        const from = airports[Math.floor(Math.random() * airports.length)];
        const to = airports[Math.floor(Math.random() * airports.length)];
        
        if (from === to) return; // Skip same airport
        
        // Calculate distance
        const fromPos = latLonToVector3(from.lat, from.lon, 1.0);
        const toPos = latLonToVector3(to.lat, to.lon, 1.0);
        const distance = fromPos.distanceTo(toPos);
        
        // Only spawn if distance is long enough
        if (distance >= minDistance) {
            createPlane(from, to);
        }
    }, 3000);
}


// Update plane positions
function updatePlanes() {
    for (let i = planes.length - 1; i >= 0; i--) {
        const plane = planes[i];
        const data = plane.userData;
        
        // If plane has landed, handle landing timer
        if (data.hasLanded) {
            data.landingTimer += 1;
            
            // Remove after 1 second on ground (60 frames at 60fps)
            if (data.landingTimer > 60) {
                globe.remove(plane);
                planes.splice(i, 1);
            }
            continue;
        }
        
        // Update progress
        data.progress += data.speed;
        
        // Check if plane has reached destination
        if (data.progress >= 1.0) {
            data.progress = 1.0;
            data.hasLanded = true;
            data.landingTimer = 0;
            // Keep plane visible on ground for a moment
            continue;
        }
        
        // Update position and orientation
        if (data.progress > 0 && data.progress <= 1) {
            const position = data.curve.getPointAt(data.progress);
            plane.position.copy(position);
            
            // Spawn trail segments periodically with occasional gaps
            data.lastTrailSpawn += 1;
            if (data.lastTrailSpawn >= data.trailSpawnInterval) {
                // Calculate direction for trail (behind the plane)
                const tangent = data.curve.getTangentAt(data.progress).normalize();
                const forwardDirection = tangent.clone().negate(); // Plane moves in negative tangent direction
                
                // Spawn trails throughout entire flight from the back of the plane
                createTrailSegment(position, forwardDirection);
                data.lastTrailSpawn = 0;
                // Occasionally create gaps (10% chance)
                if (Math.random() < 0.1) {
                    data.trailSpawnInterval = Math.random() * 10 + 5; // 5-15 frame gap
                } else {
                    data.trailSpawnInterval = 2; // Normal continuous trail
                }
            }
            
            // Update banking motion
            data.bankChangeTimer += 1;
            if (data.bankChangeTimer > 60) { // Change bank angle every ~1 second
                data.targetBankAngle = (Math.random() - 0.5) * 0.3; // Random bank between -0.15 and +0.15 radians (~8 degrees)
                data.bankChangeTimer = 0;
            }
            
            // Smoothly interpolate to target bank angle
            data.bankAngle += (data.targetBankAngle - data.bankAngle) * 0.05; // Smooth interpolation
            
            // Orient plane along path (same method as trains)
            const tangent = data.curve.getTangentAt(data.progress).normalize();
            const up = position.clone().normalize(); // Perpendicular to globe surface
            const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
            
            // Create rotation matrix from these vectors
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeBasis(right, correctedUp, tangent.negate());
            
            // Apply base rotation to plane
            plane.quaternion.setFromRotationMatrix(rotationMatrix);
            
            // Apply banking (roll) around the forward axis
            const bankQuaternion = new THREE.Quaternion();
            bankQuaternion.setFromAxisAngle(tangent, data.bankAngle);
            plane.quaternion.multiply(bankQuaternion);
            
            // Show plane when it's moving
            plane.visible = hyperloopVisible;
        }
    }
}

// Build boat route graph for multi-stop routes
function buildBoatRouteGraph() {
    boatRouteGraph = {};
    
    // Build graph from all boat connections
    boatRouteCurves.forEach(routeData => {
        // Add bidirectional connections
        if (!boatRouteGraph[routeData.from]) boatRouteGraph[routeData.from] = [];
        if (!boatRouteGraph[routeData.to]) boatRouteGraph[routeData.to] = [];
        
        boatRouteGraph[routeData.from].push({ port: routeData.to, routeData: routeData });
        boatRouteGraph[routeData.to].push({ port: routeData.from, routeData: routeData });
    });
}

// Check if a boat route is available
function isBoatRouteAvailable(fromPort, toPort) {
    const key = `${fromPort}-${toPort}`;
    const reverseKey = `${toPort}-${fromPort}`;
    return !boatRouteReservations[key] && !boatRouteReservations[reverseKey];
}

// Reserve a boat route
function reserveBoatRoute(fromPort, toPort, boatId) {
    const key = `${fromPort}-${toPort}`;
    boatRouteReservations[key] = boatId;
}

// Release a boat route
function releaseBoatRoute(fromPort, toPort, boatId) {
    const key = `${fromPort}-${toPort}`;
    if (boatRouteReservations[key] === boatId) {
        delete boatRouteReservations[key];
    }
}

// Find a multi-stop boat route (BFS with max depth)
function findMultiStopBoatRoute(maxStops) {
    const allPorts = Object.keys(boatRouteGraph);
    if (allPorts.length < 2) return null;
    
    // Pick random start port
    const startPort = allPorts[Math.floor(Math.random() * allPorts.length)];
    
    // BFS to find paths
    const queue = [{ port: startPort, path: [startPort], routes: [] }];
    const validPaths = [];
    const visited = new Set();
    
    while (queue.length > 0 && validPaths.length < 30) {
        const current = queue.shift();
        
        // Only save paths with at least 2 routes (3 ports minimum)
        if (current.routes.length >= 2 && current.path.length <= maxStops + 1) {
            validPaths.push(current);
        }
        
        // Don't go deeper than maxStops + 1 ports
        if (current.path.length > maxStops + 1) continue;
        
        // Explore neighbors
        const neighbors = boatRouteGraph[current.port] || [];
        for (const neighbor of neighbors) {
            // Don't revisit ports
            if (current.path.includes(neighbor.port)) continue;
            
            const pathKey = [...current.path, neighbor.port].join('-');
            if (visited.has(pathKey)) continue;
            visited.add(pathKey);
            
            // Check if route is available
            if (!isBoatRouteAvailable(current.port, neighbor.port)) continue;
            
            // Create a properly oriented route segment
            const orientedRoute = {
                curve: neighbor.routeData.curve,
                from: current.port,
                to: neighbor.port,
                needsReverse: neighbor.routeData.from !== current.port
            };
            
            queue.push({
                port: neighbor.port,
                path: [...current.path, neighbor.port],
                routes: [...current.routes, orientedRoute]
            });
        }
    }
    
    // Return random valid path
    if (validPaths.length === 0) return null;
    return validPaths[Math.floor(Math.random() * validPaths.length)];
}

// Create a boat (single unit) - loads from GLB
function createBoat(routeData, isMultiStop = false) {
    const curve = routeData.curve;
    const distance = calculateRouteDistance(curve);
    
    // Boats move at similar speed to trains
    const speed = distance > 1.0 ? 0.004 : 0.005;
    
    const boatGroup = new THREE.Group();
    
    // Create a simple boat geometry if model fails to load
    // Try to load boat model, but create fallback geometry
    if (gltfLoader) {
        gltfLoader.load('Boat.glb', 
            (gltf) => {
                const model = gltf.scene;
                
                // Adjust scale
                model.scale.set(0.02, 0.02, 0.02);
                model.visible = true;
                
                // Apply blue color
                const boatColor = 0x0088cc;
                const boatEmissive = 0x004488;
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshPhongMaterial({
                            color: boatColor,
                            emissive: boatEmissive,
                            emissiveIntensity: 0.3,
                            transparent: true,
                            opacity: 0.85,
                            shininess: 30
                        });
                        child.visible = true;
                        if (child.geometry) {
                            child.geometry.computeBoundingBox();
                            child.geometry.computeBoundingSphere();
                        }
                    }
                });
                
                boatGroup.add(model);
            }, 
            undefined, // Progress callback (optional)
            (error) => {
                // Fallback: create simple boat geometry
                console.warn('⚠️ Boat model not found, using fallback geometry');
                const boatGeometry = new THREE.BoxGeometry(0.03, 0.01, 0.08);
                const boatMaterial = new THREE.MeshPhongMaterial({
                    color: 0x0088cc,
                    emissive: 0x004488,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.85
                });
                const boatMesh = new THREE.Mesh(boatGeometry, boatMaterial);
                boatMesh.rotation.x = Math.PI / 2; // Rotate to align with path
                boatGroup.add(boatMesh);
            }
        );
    } else {
        // Fallback if loader not available
        const boatGeometry = new THREE.BoxGeometry(0.03, 0.01, 0.08);
        const boatMaterial = new THREE.MeshPhongMaterial({
            color: 0x0088cc,
            emissive: 0x004488,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.85
        });
        const boatMesh = new THREE.Mesh(boatGeometry, boatMaterial);
        boatMesh.rotation.x = Math.PI / 2;
        boatGroup.add(boatMesh);
    }
    
    // Store metadata
    boatGroup.userData = {
        curve: curve,
        progress: 0,
        speed: speed,
        from: routeData.from,
        to: routeData.to,
        isBoat: true,
        isMultiStop: isMultiStop,
        isNewlySpawned: true,
        boatId: Math.random().toString(36).substr(2, 9) // Always give boats an ID
    };
    
    // Reserve route for single-stop boats too
    if (!isMultiStop) {
        reserveBoatRoute(routeData.from, routeData.to, boatGroup.userData.boatId);
    }
    
    boatGroup.visible = false; // Start invisible
    boatGroup.position.set(0, 0, 0); // Start at center
    globe.add(boatGroup);
    boats.push(boatGroup);
    
    return boatGroup;
}

// Create a multi-stop boat
function createMultiStopBoat(routes) {
    // Use the first route to create the boat
    const firstRoute = routes[0];
    const boat = createBoat(firstRoute, true);
    
    // Override with multi-stop data
    boat.userData.isMultiStop = true;
    boat.userData.routes = routes;
    boat.userData.currentRouteIndex = 0;
    boat.userData.totalRoutes = routes.length;
    boat.userData.boatId = Math.random().toString(36).substr(2, 9);
    boat.userData.finalDestination = routes[routes.length - 1].to;
    boat.userData.previousPort = null;
    boat.userData.isWaiting = false;
    boat.userData.isTransitioning = false;
    
    // Reserve the first route
    reserveBoatRoute(firstRoute.from, firstRoute.to, boat.userData.boatId);
    
    // Log the full journey
    const journey = routes.map(r => `${r.from}->${r.to}`).join(' | ');
    console.log(`🚢 NEW MULTI-STOP BOAT [${boat.userData.boatId}]: ${journey}`);
    
    return boat;
}

// Update boat positions
function updateBoats() {
    for (let i = boats.length - 1; i >= 0; i--) {
        const boat = boats[i];
        const data = boat.userData;
        
        // Skip rendering newly spawned boats on first frame
        if (data.isNewlySpawned) {
            data.isNewlySpawned = false;
            continue;
        }
        
        // Update progress (but not if waiting at port)
        if (!data.isWaiting) {
            data.progress += data.speed;
        }
        
        // Handle multi-stop boats - check WHEN progress exceeds 1 (reached port)
        if (data.isMultiStop && data.progress >= 1.0 && !data.isTransitioning) {
            // Check if we're at the end and need to transition
            if (data.currentRouteIndex < data.routes.length - 1) {
                const currentFrom = data.from;
                const currentTo = data.to;
                
                // Release current route
                releaseBoatRoute(currentFrom, currentTo, data.boatId);
                
                // Get next planned route
                let nextRoute = data.routes[data.currentRouteIndex + 1];
                let canDepart = false;
                
                // Check if next route is available
                if (!isBoatRouteAvailable(nextRoute.from, nextRoute.to)) {
                    // Route blocked, wait at port
                    if (!data.isWaiting) {
                        console.log(`⏸️ BOAT [${data.boatId}] waiting at port ${currentTo}...`);
                        data.isWaiting = true;
                        data.progress = 1.0;
                    }
                    canDepart = false;
                } else {
                    canDepart = true;
                }
                
                // Only transition if we can depart
                if (canDepart) {
                    data.isTransitioning = true;
                    
                    if (data.isWaiting) {
                        data.isWaiting = false;
                    }
                    
                    // Reserve next route
                    reserveBoatRoute(nextRoute.from, nextRoute.to, data.boatId);
                    
                    // Move to next route
                    data.currentRouteIndex++;
                    
                    console.log(`🚢 BOAT [${data.boatId}] departing ${nextRoute.from} -> ${nextRoute.to} (segment ${data.currentRouteIndex + 1}/${data.routes.length})`);
                    
                    // Switch to next route
                    data.curve = nextRoute.curve;
                    data.from = nextRoute.from;
                    data.to = nextRoute.to;
                    data.previousPort = currentFrom;
                    data.needsReverse = nextRoute.needsReverse;
                    data.progress = 0;
                    
                    // Recalculate speed for new route
                    const routeDistance = calculateRouteDistance(nextRoute.curve);
                    data.speed = routeDistance > 1.0 ? 0.004 : 0.005;
                }
            } else {
                // Reached final destination, remove boat
                releaseBoatRoute(data.from, data.to, data.boatId);
                globe.remove(boat);
                boats.splice(i, 1);
                continue;
            }
        } else if (!data.isMultiStop && data.progress >= 1.0) {
            // Single-stop boat reached destination, remove
            if (data.boatId) {
                releaseBoatRoute(data.from, data.to, data.boatId);
            }
            globe.remove(boat);
            boats.splice(i, 1);
            continue;
        }
        
        // Reset transition flag once we're past the transition point
        if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
            data.isTransitioning = false;
        }
        
        // Update position and orientation
        if (data.progress > 0 && data.progress <= 1) {
            const position = data.curve.getPointAt(data.progress);
            boat.position.copy(position);
            
            // Orient boat along path (same method as trains)
            const tangent = data.curve.getTangentAt(data.progress).normalize();
            const up = position.clone().normalize();
            const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
            
            // Create rotation matrix
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeBasis(right, correctedUp, tangent.negate());
            boat.quaternion.setFromRotationMatrix(rotationMatrix);
            
            // Spawn delta trail segments periodically (more frequent for closer spacing)
            if (!data.lastTrailSpawn) data.lastTrailSpawn = 0;
            if (!data.trailSpawnInterval) data.trailSpawnInterval = 1; // Spawn every frame for tight spacing
            
            data.lastTrailSpawn += 1;
            if (data.lastTrailSpawn >= data.trailSpawnInterval) {
                // Create delta trail segment pointing forward
                const forward = tangent.clone().negate(); // Boat moves in negative tangent direction
                createBoatTrailSegment(position, forward, right, correctedUp);
                data.lastTrailSpawn = 0;
            }
            
            // Show boat when it's moving
            boat.visible = hyperloopVisible;
        }
    }
}

// Spawn boats randomly (one at a time, exactly like planes)
function spawnBoatsRandomly() {
    // Build route graph for multi-stop routes
    buildBoatRouteGraph();
    
    // Boat system initialized
    console.log(`📊 Total boat routes: ${boatRouteCurves.length}`);
    console.log(`📊 Ports in graph: ${Object.keys(boatRouteGraph).length}`);
    
    // Spawn boats every 1.5 seconds (more common than before)
    setInterval(() => {
        if (!isPageVisible || !hyperloopVisible) return;
        
        if (boatRouteCurves.length === 0) return;
        
        // Pick a random route (like planes pick random airports)
        const randomRoute = boatRouteCurves[Math.floor(Math.random() * boatRouteCurves.length)];
        
        // 75% chance for multi-stop boat (much more common than trains)
        const isMultiStop = Math.random() < 0.75;
        
        if (isMultiStop && Object.keys(boatRouteGraph).length > 0) {
            // Create multi-stop boat (2-6 stops - more stops than trains)
            const numStops = Math.floor(Math.random() * 5) + 2; // 2-6 stops
            const multiRoute = findMultiStopBoatRoute(numStops);
            
            if (multiRoute && multiRoute.routes.length >= 2) {
                createMultiStopBoat(multiRoute.routes);
            } else {
                // Fallback to single route
                createBoat(randomRoute);
            }
        } else {
            // Single route boat (most common)
            createBoat(randomRoute);
        }
    }, 800); // Spawn a new boat every 0.8 seconds (very common)
}


// Update train color based on journey progress
function updateTrainColor(train) {
    const data = train.userData;
    if (!data.isMultiStop) return;
    
    const newColor = getTrainColor(data.journeyProgress);
    
    // Calculate emissive color
    const r = (newColor >> 16) & 0xff;
    const g = (newColor >> 8) & 0xff;
    const b = newColor & 0xff;
    const emissive = ((r * 0.6) << 16) | ((g * 0.6) << 8) | (b * 0.6);
    
    // Update all wagon colors
    data.wagons.forEach(wagonGroup => {
        wagonGroup.children.forEach(child => {
            if (child.material && child.material.color) {
                child.material.color.setHex(newColor);
                
                // Only update emissive if material supports it
                if (child.material.emissive) {
                    child.material.emissive.setHex(emissive);
                }
            }
        });
    });
}

/* DISABLED - Marker color changing removed
// Set marker to waiting state (orange)
function setMarkerWaiting(cityName, isWaiting) {
    const marker = markers.find(m => m.userData.city === cityName);
    if (!marker || !marker.material) return;
    
    marker.userData.hasWaitingTrain = isWaiting;
    
    if (isWaiting) {
        // Change to orange
        if (marker.material.color) marker.material.color.setHex(0xff9933);
        if (marker.material.emissive) marker.material.emissive.setHex(0xff6600);
        console.log(`🟠 Marker at ${cityName} turned ORANGE (train waiting)`);
    } else {
        // Restore original color
        if (marker.material.color) marker.material.color.setHex(marker.userData.originalColor);
        if (marker.material.emissive) marker.material.emissive.setHex(marker.userData.originalEmissive);
        console.log(`🔴 Marker at ${cityName} restored to RED`);
    }
}
*/

// Create a multi-stop train
function createMultiStopTrain(routes) {
    // Use the first route to create the train, starts red (progress = 0)
    const firstRoute = routes[0];
    const train = createTrain(firstRoute, true, 0); // Start at 0 (red)
    
    // Override with multi-stop data
    train.userData.isMultiStop = true;
    train.userData.routes = routes;
    train.userData.currentRouteIndex = 0;
    train.userData.totalRoutes = routes.length;
    train.userData.trainId = Math.random().toString(36).substr(2, 9); // Unique ID for tracking
    train.userData.finalDestination = routes[routes.length - 1].to;
    train.userData.previousCity = null;
    train.userData.isWaiting = false;
    train.userData.journeyProgress = 0; // Starts at 0 (red)
    
    // Reserve the first route
    reserveRoute(firstRoute.from, firstRoute.to, train.userData.trainId);
    
    // Log the full journey with color indicator
    const journey = routes.map(r => `${r.from}->${r.to}${r.needsReverse?'(rev)':''}`).join(' | ');
    console.log(`🚄 NEW MULTI-STOP TRAIN [${train.userData.trainId}]: ${journey}`);
    
    return train;
}

// Update train positions
function updateTrains() {
    for (let i = trains.length - 1; i >= 0; i--) {
        const train = trains[i];
        const data = train.userData;
        
        // Skip rendering newly spawned trains on first frame
        if (data.isNewlySpawned) {
            data.isNewlySpawned = false;
            continue;
        }
        
        // Update progress (but not if waiting at station)
        if (!data.isWaiting) {
            data.progress += data.speed;
        }
        
        // Handle multi-stop trains - check WHEN progress exceeds 1 (reached station)
        if (data.isMultiStop && data.progress >= 1.0 && !data.isTransitioning) {
            // Check if we're at the end and need to transition
            if (data.currentRouteIndex < data.routes.length - 1) {
                const currentFrom = data.from;
                const currentTo = data.to;
                
                // Release current route - train has arrived at station
                releaseRoute(currentFrom, currentTo, data.trainId);
                
                // Get next planned route
                let nextRoute = data.routes[data.currentRouteIndex + 1];
                let canDepart = false;
                
                // Check if next route is available
                if (!isRouteAvailable(nextRoute.from, nextRoute.to)) {
                    console.log(`⏸️ TRAIN [${data.trainId}] at ${currentTo}, route blocked: ${nextRoute.from} -> ${nextRoute.to}, seeking alternate...`);
                    
                    // Try to find alternate route to final destination
                    const alternateRoutes = findAlternateRoute(currentTo, data.finalDestination, currentFrom, 5);
                    
                    if (alternateRoutes && alternateRoutes.length > 0) {
                        // Use alternate route
                        console.log(`🔀 TRAIN [${data.trainId}] taking alternate route (${alternateRoutes.length} hops)`);
                        data.routes = [data.routes[data.currentRouteIndex], ...alternateRoutes];
                        data.currentRouteIndex = 0; // Reset to use new route array
                        nextRoute = alternateRoutes[0];
                        canDepart = true;
                    } else {
                        // No alternate found, wait at station
                        if (!data.isWaiting) {
                            console.log(`⏸️ TRAIN [${data.trainId}] waiting at station ${currentTo}...`);
                            data.isWaiting = true;
                            data.progress = 1.0; // Clamp at station
                            // setMarkerWaiting(currentTo, true); // Disabled - no color change
                        }
                        canDepart = false;
                    }
                } else {
                    canDepart = true;
                }
                
                // Only transition if we can depart
                if (canDepart) {
                    // Mark as transitioning
                    data.isTransitioning = true;
                    
                    // Clear waiting state and restore marker
                    if (data.isWaiting) {
                        // setMarkerWaiting(currentTo, false); // Disabled - no color change
                        data.isWaiting = false;
                    }
                    
                    // Reserve next route
                    reserveRoute(nextRoute.from, nextRoute.to, data.trainId);
                    
                    // Move to next route
                    data.currentRouteIndex++;
                    
                    // Update journey progress (0 = red, 1 = green)
                    data.journeyProgress = data.currentRouteIndex / data.totalRoutes;
                    // updateTrainColor(train); // Disabled - color gradient not in use
                    
                    const progressPercent = Math.round(data.journeyProgress * 100);
                    console.log(`🚄 TRAIN [${data.trainId}] departing ${nextRoute.from} -> ${nextRoute.to} (segment ${data.currentRouteIndex + 1}/${data.routes.length}, ${progressPercent}% journey)`);
                    
                    // Switch to next route
                    data.curve = nextRoute.curve;
                    data.from = nextRoute.from;
                    data.to = nextRoute.to;
                    data.previousCity = currentFrom;
                    data.needsReverse = nextRoute.needsReverse;
                    data.progress = 0;
                    
                    // Recalculate speed for new route
                    const routeDistance = calculateRouteDistance(nextRoute.curve);
                    let baseSpeed;
                    if (routeDistance < 0.5) {
                        baseSpeed = 0.006;
                    } else if (routeDistance < 1.0) {
                        baseSpeed = 0.005;
                    } else {
                        baseSpeed = 0.004;
                    }
                    data.speed = baseSpeed + Math.random() * 0.002;
                }
            }
        }
        
        // Reset transition flag once we're past the transition point
        if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
            data.isTransitioning = false;
        }
        
        // Get curve length for accurate wagon spacing
        const curveLength = data.curve.getLength();
        const spacingProgress = data.wagonSpacing / curveLength;
        
        // Track if any wagon is still visible
        let anyWagonVisible = false;
        
        // Update each wagon position
        data.wagons.forEach((wagon, index) => {
            // Default to hidden - only show if all conditions are met
            wagon.visible = false;
            
            // If train is waiting at station, keep hidden
            if (data.isWaiting) {
                return; // Skip rendering for waiting trains
            }
            
            // Each wagon follows behind the previous one
            const wagonProgress = Math.max(0, data.progress - (spacingProgress * index));
            
            // Only show wagons with valid progress (0 < progress <= 1)
            if (wagonProgress <= 0 || wagonProgress > 1) {
                if (DEBUG_PHANTOM_WAGONS && wagonProgress > 0 && wagonProgress <= 1.1) {
                    console.log(`🚫 Wagon ${index} filtered: progress=${wagonProgress.toFixed(3)} (train [${data.trainId}])`);
                }
                return; // Wagon not yet started or already finished
            }
            
            // At this point: 0 < wagonProgress <= 1 (valid position on curve)
            
            // If route needs to be reversed, traverse curve from end to start
            let actualProgress = wagonProgress;
            if (data.needsReverse) {
                actualProgress = 1 - wagonProgress; // Reverse: 0 becomes 1, 1 becomes 0
            }
            
            // Clamp to valid range for safety
            actualProgress = Math.max(0, Math.min(1, actualProgress));
            
            // Verify we have a valid curve before proceeding
            if (!data.curve || typeof data.curve.getPointAt !== 'function') {
                console.warn(`⚠️ Invalid curve for train [${data.trainId}]`);
                return;
            }
            
            try {
                const position = data.curve.getPointAt(actualProgress);
                
                // Verify position is valid
                if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
                    console.warn(`⚠️ Invalid position for wagon ${index} in train [${data.trainId}] at progress ${actualProgress}`);
                    if (DEBUG_PHANTOM_WAGONS) {
                        console.log(`   Route: ${data.from} -> ${data.to}`);
                        console.log(`   Position:`, position);
                    }
                    return;
                }
                
                // Get the tangent (direction) at this point on the curve
                let tangent = data.curve.getTangentAt(actualProgress).normalize();
                
                // If reversed, flip the tangent direction so train faces forward
                if (data.needsReverse) {
                    tangent.negate();
                }
                
                // Calculate the up vector (perpendicular to globe surface)
                const up = position.clone().normalize();
                
                // Offset wagon position slightly above the rail line
                const offsetDistance = 0.006; // Small offset above the track
                const elevatedPosition = position.clone().add(up.multiplyScalar(offsetDistance));
                
                // Calculate right vector (perpendicular to both tangent and up)
                const right = new THREE.Vector3().crossVectors(tangent, up.clone().normalize()).normalize();
                
                // Recalculate up to be perpendicular to both tangent and right
                const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
                
                // Create rotation matrix from these vectors
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeBasis(right, correctedUp, tangent.negate()); // negate tangent for correct forward direction
                
                // Apply rotation to wagon
                wagon.quaternion.setFromRotationMatrix(rotationMatrix);
                
                // Set elevated position relative to train group
                wagon.position.copy(elevatedPosition).sub(train.position);
                
                // ONLY NOW make wagon visible - after all calculations are successful
                
                // DEBUG: Check if position is far from globe (potential phantom)
                const distanceFromCenter = elevatedPosition.length();
                const expectedDistance = 1.006; // Globe radius (1.0) + offset (0.006)
                const positionError = Math.abs(distanceFromCenter - expectedDistance);
                
                // SAFETY: Block phantom wagons that are too far from expected position
                if (positionError > 0.5) {
                    if (DEBUG_PHANTOM_WAGONS) {
                        console.warn(`👻 PHANTOM BLOCKED: Wagon ${index} in train [${data.trainId}]`);
                        console.log(`   Distance from center: ${distanceFromCenter.toFixed(3)} (expected ~${expectedDistance})`);
                        console.log(`   Position:`, elevatedPosition);
                        console.log(`   Train position:`, train.position);
                        console.log(`   Progress: ${data.progress.toFixed(3)}, Wagon progress: ${wagonProgress.toFixed(3)}`);
                        console.log(`   Route: ${data.from} -> ${data.to}`);
                        console.log(`   Is multi-stop: ${data.isMultiStop}, Transitioning: ${data.isTransitioning}`);
                    }
                    wagon.visible = false; // Keep hidden - wrong position
                    return; // Skip this wagon
                }
                
                // Position is valid - show wagon (if hyperloop is visible)
                wagon.visible = hyperloopVisible;
                anyWagonVisible = hyperloopVisible;
                
                if (DEBUG_PHANTOM_WAGONS && index === 0 && positionError <= 0.5) {
                    console.log(`✅ Wagon 0 OK: progress=${wagonProgress.toFixed(3)}, dist=${distanceFromCenter.toFixed(3)}, train [${data.trainId}]`);
                }
            } catch (error) {
                console.error(`❌ Error positioning wagon ${index} in train [${data.trainId}]:`, error);
                wagon.visible = false;
            }
        });
        
        // Hide train group if no wagons are visible
        if (!anyWagonVisible) {
            train.visible = false;
            
            // Remove train when ALL wagons have finished AND progress is complete
            if (data.progress > 1) {
                // Release route reservation
                releaseRoute(data.from, data.to, data.trainId);
                
                globe.remove(train);
                trains.splice(i, 1);
                continue;
            }
        } else {
            // At least one wagon is visible, ensure train group is visible (if hyperloop is visible)
            train.visible = hyperloopVisible;
        }
        
        // Position group at lead wagon
        if (data.progress > 0 && data.progress <= 1) {
            const position = data.curve.getPointAt(data.progress);
            train.position.copy(position);
        }
    }
}

// Convert lat/lon to 3D coordinates on sphere
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

// Optional: Add grid lines overlay (commented out by default)
function addGridLines() {
    const gridMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1
    });

    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
        const points = [];
        for (let lon = -180; lon <= 180; lon += 10) {
            points.push(latLonToVector3(lat, lon, 1.005));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        globe.add(line);
    }

    // Longitude lines
    for (let lon = -180; lon < 180; lon += 30) {
        const points = [];
        for (let lat = -90; lat <= 90; lat += 5) {
            points.push(latLonToVector3(lat, lon, 1.005));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        globe.add(line);
    }
}

// Add twinkling starfield background
function addStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000; // Number of stars
    
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
        // Random position in a sphere around the scene
        const radius = 50 + Math.random() * 50; // 50-100 units away
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        
        // Random star size (some bigger, some smaller)
        sizes[i] = Math.random() * 2.5 + 0.5;
        
        // Slight color variation (white to light blue)
        const brightness = 0.8 + Math.random() * 0.2; // 0.8-1.0
        colors[i * 3] = brightness; // R
        colors[i * 3 + 1] = brightness; // G
        colors[i * 3 + 2] = 0.95 + Math.random() * 0.05; // B (slightly more blue)
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Star material with vertex colors
    const starMaterial = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending // Makes stars glow
    });
    
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// Add city markers
function addCityMarkers() {
    cities.forEach(city => {
        const position = latLonToVector3(city.lat, city.lon, 1.02);
        
        // Create marker sphere (smaller size)
        const markerGeometry = new THREE.SphereGeometry(0.010, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        marker.userData = { 
            city: city.name,
            lat: city.lat,
            lon: city.lon,
            isMarker: true
        };
        
        globe.add(marker);
        markers.push(marker);

        // Add a pin line from marker to surface
        const linePoints = [
            latLonToVector3(city.lat, city.lon, 1.0),
            position
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.isMarkerPin = true; // Mark for visibility toggle
        globe.add(line);
    });
}

// Add seaport markers (blue)
function addSeaportMarkers() {
    seaports.forEach(seaport => {
        const position = latLonToVector3(seaport.lat, seaport.lon, 1.02);
        
        // Create marker sphere (blue for seaports)
        const markerGeometry = new THREE.SphereGeometry(0.010, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            emissive: 0x0088ff,
            emissiveIntensity: 0.5
        });
        
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        marker.userData = { 
            seaport: seaport.name,
            lat: seaport.lat,
            lon: seaport.lon,
            isSeaportMarker: true
        };
        
        marker.visible = false; // Hide port markers
        globe.add(marker);
        
        // Add a pin line from marker to surface
        const linePoints = [
            latLonToVector3(seaport.lat, seaport.lon, 1.0),
            position
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0088ff });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.isSeaportMarkerPin = true;
        line.visible = false; // Hide port marker pins
        globe.add(line);
    });
}

// Add seaport connection lines (red)
function addSeaportConnectionLines() {
    seaportConnections.forEach(connection => {
        // Find the port coordinates
        const fromPort = seaports.find(p => p.name === connection.from);
        const toPort = seaports.find(p => p.name === connection.to);
        
        if (!fromPort || !toPort) {
            console.warn(`Seaport connection not found: ${connection.from} to ${connection.to}`);
            return;
        }
        
        // Create curved line between ports
        const curvePoints = createArcBetweenPoints(
            fromPort.lat, fromPort.lon,
            toPort.lat, toPort.lon,
            1.0, // On globe surface (boats sit on the sea)
            50,    // Number of segments for smooth curve
            false  // Flat curve (boats stay close to water)
        );
        
        // Use TubeGeometry for visible lines (thin red)
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        
        // Store curve for boat animation
        boatRouteCurves.push({
            curve: curve,
            from: connection.from,
            to: connection.to
        });
        
        // Red line for seaport connections
        const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.002, 8, false);
        const tubeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,  // Red color
            transparent: true,
            opacity: 0.8
        });
        
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.userData.isSeaportConnectionLine = true; // Mark for visibility toggle
        tube.visible = false; // Hide red lines
        globe.add(tube);
    });
}

// Add glowing connection lines between cities
function addConnectionLines() {
    connections.forEach(connection => {
        // Find the city coordinates
        const fromCity = cities.find(c => c.name === connection.from);
        const toCity = cities.find(c => c.name === connection.to);
        
        if (!fromCity || !toCity) {
            console.warn(`Connection not found: ${connection.from} to ${connection.to}`);
            return;
        }
        
        // Create curved line between cities
        const curvePoints = createArcBetweenPoints(
            fromCity.lat, fromCity.lon,
            toCity.lat, toCity.lon,
            1.03, // Height above globe surface
            50,   // Number of segments for smooth curve
            true  // Is main connection (higher curve)
        );
        
        // Use TubeGeometry for visible lines (thin)
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        
        // Store curve for train animation (main routes)
        routeCurves.push({
            curve: curve,
            from: connection.from,
            to: connection.to,
            isMainRoute: true
        });
        
        // Main core line - golden
        const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.002, 8, false);
        const tubeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,  // Golden color
            transparent: true,
            opacity: 0.95
        });
        
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.userData.isConnectionLine = true; // Mark for visibility toggle
        globe.add(tube);
        
        // Create gradient glow using custom geometry with varying opacity - reduced
        const glowSegments = 50;
        for (let layer = 0; layer < 2; layer++) { // Reduced from 3 to 2 layers
            const radiusMultiplier = 1 + layer * 0.8; // Layers at different radii - reduced multiplier
            const baseRadius = 0.002 * radiusMultiplier; // Base radius for glow - reduced from 0.004
            
            // Create custom tube with varying radius
            const points = curve.getPoints(glowSegments);
            const radialSegments = 8;
            const radiusArray = [];
            
            // Calculate radius for each point (thinner at ends, thicker in middle)
            for (let i = 0; i <= glowSegments; i++) {
                const t = i / glowSegments;
                // Sine wave creates smooth fade at endpoints
                const fadeFactor = Math.sin(t * Math.PI);
                radiusArray.push(baseRadius * fadeFactor);
            }
            
            // Create tube with variable radius
            const glowPath = new THREE.CatmullRomCurve3(points);
            const glowGeometry = new THREE.TubeGeometry(
                glowPath, 
                glowSegments, 
                baseRadius, 
                radialSegments, 
                false
            );
            
            // Modify radius based on position
            const positionAttr = glowGeometry.attributes.position;
            for (let i = 0; i < positionAttr.count; i++) {
                const segmentIndex = Math.floor(i / (radialSegments + 1));
                if (segmentIndex < radiusArray.length) {
                    const scaleFactor = radiusArray[segmentIndex] / baseRadius;
                    const x = positionAttr.getX(i);
                    const y = positionAttr.getY(i);
                    const z = positionAttr.getZ(i);
                    
                    // Get center point for this segment
                    const centerPoint = points[segmentIndex];
                    
                    // Scale outward from center
                    const dx = x - centerPoint.x;
                    const dy = y - centerPoint.y;
                    const dz = z - centerPoint.z;
                    
                    positionAttr.setXYZ(
                        i,
                        centerPoint.x + dx * scaleFactor,
                        centerPoint.y + dy * scaleFactor,
                        centerPoint.z + dz * scaleFactor
                    );
                }
            }
            positionAttr.needsUpdate = true;
            
            // Golden glow material with strong dissipation for outer layers - reduced opacity
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffcc00,  // Golden-yellow for glow
                transparent: true,
                opacity: 0.3 / (layer + 1) // Further reduced: 0.3, 0.15
            });
            
            const glowTube = new THREE.Mesh(glowGeometry, glowMaterial);
            glowTube.userData.isConnectionLine = true; // Mark for visibility toggle
            globe.add(glowTube);
        }
    });
}

// Add secondary connection lines (white, segmented, thinner glow)
function addSecondaryConnectionLines() {
    secondaryConnections.forEach(connection => {
        // Find the city coordinates
        const fromCity = cities.find(c => c.name === connection.from);
        const toCity = cities.find(c => c.name === connection.to);
        
        if (!fromCity || !toCity) {
            console.warn(`Secondary connection not found: ${connection.from} to ${connection.to}`);
            return;
        }
        
        // Create curved line between cities (lower altitude for secondary)
        const curvePoints = createArcBetweenPoints(
            fromCity.lat, fromCity.lon,
            toCity.lat, toCity.lon,
            1.025, // Lower height for secondary connections
            50,    // Number of segments for smooth curve
            false  // Is secondary connection (lower curve)
        );
        
        // Use TubeGeometry for visible lines (thin)
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        
        // Store curve for train animation (secondary routes)
        routeCurves.push({
            curve: curve,
            from: connection.from,
            to: connection.to,
            isMainRoute: false
        });
        
        // Main core line - white
        const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.0015, 8, false);
        const tubeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,  // White color
            transparent: true,
            opacity: 0.8
        });
        
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.userData.isSecondaryLine = true; // Mark for visibility toggle
        globe.add(tube);
        
        // Add subtle glow (only one layer, thinner) - further reduced
        const glowSegments = 50;
        const baseRadius = 0.002; // Reduced from 0.003
        
        const points = curve.getPoints(glowSegments);
        const radialSegments = 8;
        const radiusArray = [];
        
        // Calculate radius for each point (thinner at ends, thicker in middle)
        for (let i = 0; i <= glowSegments; i++) {
            const t = i / glowSegments;
            const fadeFactor = Math.sin(t * Math.PI);
            radiusArray.push(baseRadius * fadeFactor);
        }
        
        // Create tube with variable radius
        const glowPath = new THREE.CatmullRomCurve3(points);
        const glowGeometry = new THREE.TubeGeometry(
            glowPath, 
            glowSegments, 
            baseRadius, 
            radialSegments, 
            false
        );
        
        // Modify radius based on position
        const positionAttr = glowGeometry.attributes.position;
        for (let i = 0; i < positionAttr.count; i++) {
            const segmentIndex = Math.floor(i / (radialSegments + 1));
            if (segmentIndex < radiusArray.length) {
                const scaleFactor = radiusArray[segmentIndex] / baseRadius;
                const x = positionAttr.getX(i);
                const y = positionAttr.getY(i);
                const z = positionAttr.getZ(i);
                
                const centerPoint = points[segmentIndex];
                
                const dx = x - centerPoint.x;
                const dy = y - centerPoint.y;
                const dz = z - centerPoint.z;
                
                positionAttr.setXYZ(
                    i,
                    centerPoint.x + dx * scaleFactor,
                    centerPoint.y + dy * scaleFactor,
                    centerPoint.z + dz * scaleFactor
                );
            }
        }
        positionAttr.needsUpdate = true;
        
        // White glow material (subtle) - further reduced
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaaaff,  // Slight blue-white for glow
            transparent: true,
            opacity: 0.15 // Reduced from 0.2
        });
        
        const glowTube = new THREE.Mesh(glowGeometry, glowMaterial);
        glowTube.userData.isSecondaryLine = true; // Mark for visibility toggle
        globe.add(glowTube);
    });
}

// Create a smooth arc between two lat/lon points using Great Circle route
function createArcBetweenPoints(lat1, lon1, lat2, lon2, altitude, segments, isMainConnection = true) {
    const points = [];
    
    // Convert degrees to radians
    const lat1Rad = lat1 * Math.PI / 180;
    const lon1Rad = lon1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lon2Rad = lon2 * Math.PI / 180;
    
    // Calculate angular distance between points
    const dLon = lon2Rad - lon1Rad;
    const dLat = lat2Rad - lat1Rad;
    
    // Haversine formula for great circle distance
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Calculate arc height based on distance
    // Shorter distances = smaller arc, longer distances = bigger arc
    // angularDistance ranges from 0 to π (half the globe)
    const distanceFactor = angularDistance / Math.PI; // Normalize to 0-1
    
    // Main connections get higher arcs, secondary get lower arcs
    const baseArcHeight = isMainConnection ? 0.03 : 0.02;
    const maxArcHeight = baseArcHeight * distanceFactor; // Scale with distance
    
    // Minimum arc height to ensure some curve even for close points
    const minArcHeight = isMainConnection ? 0.005 : 0.003;
    const finalArcHeight = Math.max(minArcHeight, maxArcHeight);
    
    // Generate points along the great circle
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const fraction = t * angularDistance;
        
        // Interpolate along great circle
        const A = Math.sin((1 - t) * angularDistance) / Math.sin(angularDistance);
        const B = Math.sin(t * angularDistance) / Math.sin(angularDistance);
        
        const x = A * Math.cos(lat1Rad) * Math.cos(lon1Rad) + B * Math.cos(lat2Rad) * Math.cos(lon2Rad);
        const y = A * Math.cos(lat1Rad) * Math.sin(lon1Rad) + B * Math.cos(lat2Rad) * Math.sin(lon2Rad);
        const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);
        
        // Convert back to lat/lon
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
        const lon = Math.atan2(y, x) * 180 / Math.PI;
        
        // Add arc height proportional to distance
        const arcHeight = Math.sin(t * Math.PI) * finalArcHeight;
        const currentAltitude = altitude + arcHeight;
        
        // Convert to 3D position
        const point = latLonToVector3(lat, lon, currentAltitude);
        points.push(point);
    }
    
    return points;
}

// Setup mouse/touch controls
function setupControls(container) {
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseUp);
    container.addEventListener('wheel', onWheel);
    container.addEventListener('click', onMarkerClick); // Re-enabled for port name display

    // Touch events for mobile
    container.addEventListener('touchstart', onTouchStart);
    container.addEventListener('touchmove', onTouchMove);
    container.addEventListener('touchend', onMouseUp);
}

function onMouseDown(event) {
    isDragging = true;
    autoRotate = false;
    
    // Clear any pending auto-rotate timeout
    if (autoRotateTimeout) {
        clearTimeout(autoRotateTimeout);
        autoRotateTimeout = null;
    }
    
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Track if mouse moved (to differentiate click from drag)
    window.mouseMoved = false;
}

function onMouseMove(event) {
    if (!isDragging) return;
    
    window.mouseMoved = true;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    rotationVelocity.x = deltaY * 0.005;
    rotationVelocity.y = deltaX * 0.005;

    globe.rotation.y += rotationVelocity.y;
    globe.rotation.x += rotationVelocity.x;

    // Limit vertical rotation
    globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
    
    // Set timeout to resume auto-rotation after 5 seconds of inactivity
    if (autoRotateEnabled && autoRotateTimeout) {
        clearTimeout(autoRotateTimeout);
    }
    
    if (autoRotateEnabled) {
        autoRotateTimeout = setTimeout(() => {
            autoRotate = true;
            rotationVelocity.x = 0;
            rotationVelocity.y = 0;
        }, 5000); // 5 second delay
    }
}

// Handle marker clicks (enabled for port name display)
function onMarkerClick(event) {
    // Don't register click if mouse was dragged
    if (window.mouseMoved) return;
    
    const container = document.getElementById('globe-container');
    const rect = container.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycaster for detecting clicks on 3D objects
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Collect all clickable objects (city markers and seaport markers)
    const clickableObjects = [...markers];
    globe.traverse((child) => {
        if (child.userData && child.userData.isSeaportMarker) {
            clickableObjects.push(child);
        }
    });
    
    // Check for intersections with markers
    const intersects = raycaster.intersectObjects(clickableObjects);
    
    if (intersects.length > 0) {
        const clickedMarker = intersects[0].object;
        if (clickedMarker.userData.isMarker) {
            // City marker clicked
            if (activeMarker === clickedMarker && labelElement) {
                hideCityLabel();
                activeMarker = null;
            } else {
                // Show label for new marker
                activeMarker = clickedMarker;
                showCityLabel(clickedMarker.userData.city, event.clientX, event.clientY);
            }
        } else if (clickedMarker.userData.isSeaportMarker) {
            // Seaport marker clicked - show port name
            const portName = clickedMarker.userData.seaport;
            if (activeMarker === clickedMarker && labelElement) {
                hideCityLabel();
                activeMarker = null;
            } else {
                activeMarker = clickedMarker;
                showCityLabel(portName, event.clientX, event.clientY);
            }
        }
    } else {
        // Clicked elsewhere (not on a marker) - hide label
        hideCityLabel();
        activeMarker = null;
    }
}

// Show city name label (stays attached to marker until dismissed)
function showCityLabel(cityName, x, y) {
    // Remove existing label if any
    hideCityLabel();
    
    // Create new label
    labelElement = document.createElement('div');
    labelElement.id = 'city-label';
    labelElement.className = 'city-label';
    labelElement.textContent = cityName;
    labelElement.style.position = 'fixed';
    labelElement.style.left = x + 'px';
    labelElement.style.top = y + 'px';
    labelElement.style.transform = 'translate(-50%, -120%)';
    labelElement.style.background = 'rgba(13, 71, 161, 0.95)';
    labelElement.style.color = 'white';
    labelElement.style.padding = '8px 16px';
    labelElement.style.borderRadius = '5px';
    labelElement.style.fontSize = '14px';
    labelElement.style.fontWeight = 'bold';
    labelElement.style.pointerEvents = 'none';
    labelElement.style.zIndex = '1000';
    labelElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    labelElement.style.whiteSpace = 'nowrap';
    labelElement.style.transition = 'opacity 0.2s';
    
    document.body.appendChild(labelElement);
    
    // Label stays attached to marker until dismissed (no auto-remove)
}

// Hide city label
function hideCityLabel() {
    if (labelElement && labelElement.parentNode) {
        labelElement.remove();
    }
    labelElement = null;
    activeMarker = null;
}

// Update label position to follow marker
function updateLabelPosition() {
    if (!activeMarker || !labelElement) return;
    
    const container = document.getElementById('globe-container');
    if (!container) return;
    
    // Get marker's current world position (updates as globe rotates)
    const worldPosition = new THREE.Vector3();
    activeMarker.getWorldPosition(worldPosition);
    
    // Clone for projection (don't modify original)
    const screenPosition = worldPosition.clone();
    
    // Project 3D position to 2D screen coordinates
    screenPosition.project(camera);
    
    // Check if marker is behind the camera or globe
    const markerDir = worldPosition.clone().sub(camera.position).normalize();
    const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const dotProduct = markerDir.dot(cameraDir);
    
    // If marker is on the back side (behind globe), hide label
    if (dotProduct < 0.3) {
        labelElement.style.opacity = '0';
        return;
    }
    
    // Convert normalized device coordinates to screen pixels
    const rect = container.getBoundingClientRect();
    const x = (screenPosition.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-screenPosition.y * 0.5 + 0.5) * rect.height + rect.top;
    
    // Only show if within screen bounds
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        labelElement.style.left = x + 'px';
        labelElement.style.top = y + 'px';
        labelElement.style.opacity = '1';
    } else {
        labelElement.style.opacity = '0';
    }
}
function onTouchStart(event) {
    if (event.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        
        // Clear any pending auto-rotate timeout
        if (autoRotateTimeout) {
            clearTimeout(autoRotateTimeout);
            autoRotateTimeout = null;
        }
        
        previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
        window.mouseMoved = false;
    }
}

function onTouchMove(event) {
    if (!isDragging || event.touches.length !== 1) return;
    
    event.preventDefault();
    
    const deltaX = event.touches[0].clientX - previousMousePosition.x;
    const deltaY = event.touches[0].clientY - previousMousePosition.y;

    rotationVelocity.x = deltaY * 0.005;
    rotationVelocity.y = deltaX * 0.005;

    globe.rotation.y += rotationVelocity.y;
    globe.rotation.x += rotationVelocity.x;

    globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));

    previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}

function onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY * 0.001;
    camera.position.z += delta;
    camera.position.z = Math.max(1.5, Math.min(5, camera.position.z));
}

function onWindowResize() {
    const container = document.getElementById('globe-container');
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Auto-rotate when not dragging
    if (autoRotate && autoRotateEnabled) {
        globe.rotation.y += 0.001;
    } else if (!autoRotate) {
        // Apply friction to rotation velocity
        rotationVelocity.x *= 0.95;
        rotationVelocity.y *= 0.95;
    }
    

    // Make markers pulse
    const time = Date.now() * 0.003;
    markers.forEach((marker, index) => {
        const scale = 1 + Math.sin(time + index) * 0.2;
        marker.scale.set(scale, scale, scale);
    });
    
    // Animate starfield (twinkling effect)
    if (stars) {
        const sizes = stars.geometry.attributes.size.array;
        const baseTime = Date.now() * 0.001;
        
        for (let i = 0; i < sizes.length; i++) {
            // Each star twinkles at slightly different rate
            const twinkleSpeed = 1.0 + (i % 10) * 0.1;
            const phase = i * 0.1; // Phase offset for each star
            sizes[i] = (0.5 + Math.sin(baseTime * twinkleSpeed + phase) * 0.5) * (Math.random() * 2.5 + 0.5);
        }
        
        stars.geometry.attributes.size.needsUpdate = true;
        
        // Slowly rotate starfield for subtle movement
        stars.rotation.y += 0.0001;
        stars.rotation.x += 0.00005;
    }
    
    // Update all transport systems
    updateTrains();
    updatePlanes();
    updateTrailSegments(); // Update independent trail segments
    updateBoatTrailSegments(); // Update boat trail segments
    updateBoats();

    // Update label position if active (DISABLED)
    // updateLabelPosition();

    renderer.render(scene, camera);
}

// Setup page visibility tracking to pause train spawning when tab is hidden
function setupPageVisibilityTracking() {
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden (tab switched or minimized)
            isPageVisible = false;
            console.log('⏸️ Page hidden - train spawning paused');
        } else {
            // Page is visible again
            isPageVisible = true;
            console.log('▶️ Page visible - train spawning resumed');
        }
    });
    
    // Initialize state based on current visibility
    isPageVisible = !document.hidden;
}

// Setup auto-rotate toggle button
function setupAutoRotateToggle() {
    const toggleBtn = document.getElementById('autoRotateToggle');
    if (!toggleBtn) return;
    
    // Set initial state
    if (autoRotateEnabled) {
        toggleBtn.classList.add('active');
    }
    
    const rotateIcon = document.getElementById('rotateIcon');
    
    // Replace text with rotation icon image
    rotateIcon.innerHTML = '<img src="https://i.imgur.com/EIiYust.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
    
    // Prevent button from interfering with globe controls
    toggleBtn.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    
    toggleBtn.addEventListener('mouseup', (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    
    toggleBtn.addEventListener('touchstart', (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    
    toggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        autoRotateEnabled = !autoRotateEnabled;
        
        if (autoRotateEnabled) {
            toggleBtn.classList.add('active');
            autoRotate = true; // Start rotating immediately
            if (autoRotateTimeout) {
                clearTimeout(autoRotateTimeout);
                autoRotateTimeout = null;
            }
        } else {
            toggleBtn.classList.remove('active');
            autoRotate = false; // Stop rotating
            if (autoRotateTimeout) {
                clearTimeout(autoRotateTimeout);
                autoRotateTimeout = null;
            }
        }
    });
}

// Setup hyperloop toggle button
function setupHyperloopToggle() {
    const toggleBtn = document.getElementById('hyperloopToggle');
    if (!toggleBtn) return;
    
    // Set initial state
    if (hyperloopVisible) {
        toggleBtn.classList.add('active');
    }
    
    const hyperloopIcon = document.getElementById('hyperloopIcon');
    
    // Replace with train icon image
    hyperloopIcon.innerHTML = '<img src="https://i.imgur.com/l1TDZwh.png" alt="Hyperloop" style="width: 100%; height: 100%; object-fit: contain;">';
    
    // Prevent button from interfering with globe controls
    toggleBtn.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    
    toggleBtn.addEventListener('mouseup', (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    
    toggleBtn.addEventListener('touchstart', (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    
    toggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        hyperloopVisible = !hyperloopVisible;
        
        if (hyperloopVisible) {
            toggleBtn.classList.add('active');
            console.log('🚄 Transport systems ENABLED (Trains, Planes)');
        } else {
            toggleBtn.classList.remove('active');
            console.log('⏸️ Transport systems DISABLED - all vehicles will finish invisibly, no new spawns');
        }
        
        // Update visibility immediately
        updateHyperloopVisibility();
    });
}

// Update visibility of all transport system elements
function updateHyperloopVisibility() {
    // Toggle markers visibility
    markers.forEach(marker => {
        marker.visible = hyperloopVisible;
    });
    
    // Toggle connection lines and marker pins visibility
    scene.traverse((object) => {
        if (object.userData) {
            // Keep seaport markers and connection lines always hidden (debug only)
            if (object.userData.isSeaportMarker || object.userData.isSeaportMarkerPin || object.userData.isSeaportConnectionLine) {
                object.visible = false; // Always hidden
            } else if (object.userData.isConnectionLine || object.userData.isSecondaryLine || object.userData.isMarkerPin) {
                object.visible = hyperloopVisible;
            }
        }
    });
    
    // Toggle train visibility (trains will continue to exist and move, just invisible)
    trains.forEach(train => {
        if (hyperloopVisible) {
            // Re-show train if it has visible wagons
            const data = train.userData;
            if (data && data.progress > 0 && data.progress <= 1 && !data.isWaiting) {
                train.visible = true;
            }
        } else {
            // Hide all trains
            train.visible = false;
        }
    });
    
    // Toggle plane visibility
    planes.forEach(plane => {
        if (hyperloopVisible) {
            const data = plane.userData;
            if (data && data.progress > 0 && data.progress <= 1) {
                plane.visible = true;
            }
        } else {
            plane.visible = false;
        }
    });
    
    // Toggle boat visibility
    boats.forEach(boat => {
        if (hyperloopVisible) {
            const data = boat.userData;
            if (data && data.progress > 0 && data.progress <= 1 && !data.isWaiting) {
                boat.visible = true;
            }
        } else {
            boat.visible = false;
        }
    });
    
    // Toggle boat trail visibility (ensure all trails respect toggle)
    boatTrails.forEach(trail => {
        trail.visible = hyperloopVisible;
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('globe-container')) {
        initGlobe();
        setupAutoRotateToggle();
        setupHyperloopToggle();
        setupPageVisibilityTracking();
    }
});

