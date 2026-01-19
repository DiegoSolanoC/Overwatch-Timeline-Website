/**
 * TransportConfig - Centralized configuration for all transport systems
 * Replaces magic numbers with named constants
 */

export const TransportConfig = {
    // ========== TIMEOUTS & DELAYS ==========
    TIMEOUTS: {
        INITIAL_PANEL_POSITIONING: 50,       // ms to wait before positioning Moon/Mars panels
        EVENT_SYNC_RETRY: 300,               // ms between event sync retries
        EVENT_SYNC_FINAL: 1000,              // ms for final event sync attempt
        SATELLITE_MARKER_DELAY: 100          // ms to wait before adding satellite markers
    },

    // ========== ROUTE FINDING ==========
    ROUTE: {
        CURVE_POINTS: 50,                    // Points used for curve distance calculation
        MAX_HOPS: 5,                         // Maximum hops for alternate route finding
        MIN_STOPS: 2,                        // Minimum cities/ports for multi-stop
        MAX_VALID_PATHS: 30,                 // Maximum valid paths to search
        MIN_PATH_LENGTH: 2                   // Minimum length for valid multi-stop path
    },

    // ========== ZOOM SETTINGS ==========
    ZOOM: {
        MIN: 1.5,                            // Minimum camera zoom distance
        MAX_DESKTOP: 5.0,                    // Maximum zoom out on desktop
        MAX_MOBILE_PORTRAIT: 7.0,            // Maximum zoom out on mobile portrait
        STEP_SIZE: 0.4,                      // Zoom step per button click
        TARGET_DISTANCE: 2.5                 // Target distance when zooming to marker
    },

    // ========== CAMERA SETTINGS ==========
    CAMERA: {
        DEFAULT_DESKTOP: 3.5,                // Default camera Z position on desktop
        DEFAULT_MOBILE_PORTRAIT: 5.5,        // Default camera Z position on mobile portrait
        ANIMATION_DURATION: 500              // ms for camera animations
    },

    // ========== MODEL SCALING ==========
    MODELS: {
        SCALE: 0.02,                         // Standard scale for all 3D models
        TRAIN_SCALE: { x: 0.02, y: 0.02, z: 0.02 },
        PLANE_SCALE: { x: 0.02, y: 0.02, z: 0.02 },
        BOAT_SCALE: { x: 0.02, y: 0.02, z: 0.02 },
        SATELLITE_SCALE: { x: 0.02, y: 0.02, z: 0.02 }
    },

    // ========== MATERIAL COLORS ==========
    COLORS: {
        VEHICLE_BASE: 0x0088cc,              // Blue for trains, planes, boats, ISS
        VEHICLE_EMISSIVE: 0x004488,          // Emissive blue
        MARS_SHIP_BASE: 0xff0000,            // Red for Mars Ship
        MARS_SHIP_EMISSIVE: 0x440000,        // Emissive red
        ISS_BASE: 0x0088cc,                  // Blue for ISS (Space Station)
        ISS_EMISSIVE: 0x004488,              // Emissive blue for ISS
        PULSE_RING: 0xffaa00                 // Yellow-orange for hover pulse
    },

    // ========== MATERIAL PROPERTIES ==========
    MATERIAL: {
        EMISSIVE_INTENSITY: 0.3,
        OPACITY: 0.85,
        SHININESS: 30,
        PULSE_RING_OPACITY: 0.9
    },

    // ========== TRAINS ==========
    TRAIN: {
        // Wagon counts based on route distance
        WAGON_COUNT: {
            SHORT_ROUTE_DISTANCE: 0.5,       // Distance threshold for short routes
            MEDIUM_ROUTE_DISTANCE: 1.0,      // Distance threshold for medium routes
            SHORT_MAX: 2,                    // Max wagons on short routes
            MEDIUM_MAX: 4,                   // Max wagons on medium routes
            LONG_MAX: 6,                     // Max wagons on long routes
            MIN_NORMAL: 3,                   // Min wagons for normal trains (70% chance)
            SMALL_TRAIN_CHANCE: 0.7          // Probability of normal-sized train
        },
        // Speeds based on route distance
        SPEED: {
            SHORT_BASE: 0.006,               // Base speed for short routes
            MEDIUM_BASE: 0.005,              // Base speed for medium routes
            LONG_BASE: 0.004,                // Base speed for long routes
            RANDOM_VARIANCE: 0.002           // Random speed variation
        },
        WAGON_SPACING: 0.045,                // Distance between wagons
        ELEVATION_OFFSET: 0.006,             // How much to elevate wagons above surface
        MAX_COUNT: 15,                       // Maximum trains allowed
        SPAWN_INTERVAL: 1000,                // ms between spawn attempts
        MULTI_STOP_CHANCE: 0.33,             // Probability of multi-stop train
        MAX_STOPS: 5                         // Maximum stops for pathfinding
    },

    // ========== PLANES ==========
    PLANE: {
        // Altitude settings
        ALTITUDE: {
            MIN: 1.04,                       // Minimum cruise altitude
            MAX: 1.08,                       // Maximum cruise altitude
            GROUND_LEVEL: 1.005,             // Ground level for takeoff/landing
            DISTANCE_NORMALIZER: 1.5         // Distance normalizer for altitude calculation
        },
        // Flight phases
        PHASES: {
            TAKEOFF_BASE: 0.25,              // Base takeoff phase duration
            TAKEOFF_DISTANCE_FACTOR: 0.05,   // Takeoff phase reduction per distance
            LANDING_BASE: 0.50,              // Base landing phase duration
            LANDING_DISTANCE_FACTOR: 0.10    // Landing phase reduction per distance
        },
        // Speeds
        SPEED: {
            LONG_DISTANCE: 0.0015,           // Speed for long distance flights (>1.5)
            SHORT_DISTANCE: 0.0020,          // Speed for short distance flights
            DISTANCE_THRESHOLD: 1.5          // Threshold for long vs short distance
        },
        // Banking (tilting during turns)
        BANKING: {
            MAX_ANGLE: 0.3,                  // Maximum bank angle
            CHANGE_TIMER: 60,                // Frames between bank angle changes
            INTERPOLATION_SPEED: 0.05        // How fast to interpolate to target bank
        },
        TRAIL_SPAWN_INTERVAL: 2,             // Frames between trail spawns
        LANDING_TIMER_MAX: 60,               // Frames before removing landed plane
        FLIGHT_SEGMENTS: 60,                 // Number of segments in flight path
        MIN_DISTANCE: 0.4,                   // Minimum distance for flight
        MAX_COUNT: 10,                       // Maximum planes allowed
        SPAWN_INTERVAL: 3000,                // ms between spawn attempts
        MULTI_STOP_CHANCE: 0.4,              // Probability of multi-stop plane
        MIN_STOPS: 2,                        // Minimum stops for multi-stop
        MAX_STOPS: 4                         // Maximum stops for multi-stop
    },

    // ========== BOATS ==========
    BOAT: {
        // Speeds based on route distance
        SPEED: {
            LONG_BASE: 0.004,                // Speed for long routes (>1.0)
            SHORT_BASE: 0.005,               // Speed for short routes
            DISTANCE_THRESHOLD: 1.0          // Threshold for long vs short routes
        },
        // Trail spawn intervals based on route distance
        TRAIL: {
            VERY_SHORT_DISTANCE: 0.3,        // Distance threshold for very short routes
            SHORT_DISTANCE: 0.6,             // Distance threshold for short routes
            VERY_SHORT_INTERVAL: 0.5,        // Spawn interval for very short routes
            SHORT_INTERVAL: 0.75,            // Spawn interval for short routes
            DEFAULT_INTERVAL: 1              // Default spawn interval
        },
        MAX_COUNT: 15,                       // Maximum boats allowed
        SPAWN_INTERVAL: 800,                 // ms between spawn attempts
        MULTI_STOP_CHANCE: 0.75,             // Probability of multi-stop boat
        MIN_STOPS: 2,                        // Minimum stops for multi-stop
        MAX_STOPS: 7                         // Maximum stops (5 + 2)
    },

    // ========== SATELLITES ==========
    SATELLITE: {
        // Orbit radii
        ORBIT: {
            UNIFORM_RADIUS: 1.22,            // Standard orbit radius for small satellites
            ISS_RADIUS: 1.25,                // ISS orbit radius (slightly further)
            MARS_SHIP_RADIUS: 1.28,          // Mars Ship orbit radius (furthest)
            MIN_SAFE_RADIUS: 1.01,           // Minimum safe radius (Earth radius + buffer)
            INCLINATION_BUFFER: 0.02         // Buffer for inclined orbits
        },
        // Orbital speeds
        SPEED: {
            BASE: 0.0008,                    // Base orbital speed
            RANDOM_VARIANCE: 0.0015          // Random speed variation
        },
        // Speed multipliers for station events
        SPEED_MULTIPLIER: {
            STATION_ON_PAGE: 0.5,            // Halve speed when station marker on page
            HOVERING_MARKER: 0.5             // Halve again when hovering (total 1/4)
        },
        // Inclinations
        INCLINATION: {
            ISS: Math.PI / 6,                // 30 degrees for ISS
            MARS_SHIP: Math.PI / 1.5,        // ~120 degrees for Mars Ship
            MARS_ROTATION_OFFSET: 0.2        // Tilt offset for Mars Ship orbit
        },
        // Specific locations for Mars Ship orbit
        MARS_SHIP_LOCATIONS: {
            VERACRUZ: { lat: 19.1738, lon: -96.1342 },
            GIBRALTAR: { lat: 36.1408, lon: -5.3536 }
        },
        // Trail settings
        TRAIL: {
            SPAWN_CHANCE: 0.25,              // Probability of spawning trail (25%)
            INTERVAL_MIN: 3,                 // Minimum frames between trail checks
            INTERVAL_MAX: 10                 // Maximum frames between trail checks (3 + 7)
        },
        // Orbit line
        ORBIT_LINE: {
            SEGMENTS: 100,                   // Number of segments in orbit visualization
            TUBE_RADIUS: 0.001,              // Radius of orbit line tube
            OPACITY: 0.6,                    // Orbit line opacity
            ISS_COLOR: 0x0088cc,             // Blue for ISS orbit
            DEFAULT_COLOR: 0x9b59b6          // Purple for other satellites
        },
        SMALL_COUNT: 25,                     // Number of small satellites to spawn
        PIN_LINE_LENGTH: 0.06                // Length of pin line for station markers
    },

    // ========== PULSE RINGS (HOVER EFFECTS) ==========
    PULSE: {
        RING: {
            INITIAL_RADIUS: 0.02,            // Starting radius of pulse ring
            MAX_SCALE: 4,                    // Maximum scale factor
            DURATION: 1200,                  // Duration of pulse animation (ms)
            DELAY_BETWEEN: 1500              // Delay between pulse rings (ms)
        },
        MARKER: {
            BASE_SCALE: 1.0,                 // Base scale for markers
            MIN_SCALE: 0.85,                 // Minimum scale during pulse
            MAX_SCALE: 1.20,                 // Maximum scale during pulse
            SPEED: 0.008                     // Pulse speed multiplier
        }
    },

    // ========== MOON & MARS PANELS ==========
    PANELS: {
        SIZE: { width: 0.4, height: 0.4 },   // Panel dimensions
        // Desktop positions (vertical layout on right)
        DESKTOP: {
            MOON: { x: 1.5, y: 0.3, z: 0 },  // Right side, above center
            MARS: { x: 1.5, y: -0.3, z: 0 }  // Right side, below center
        },
        // Mobile portrait positions (horizontal layout at top)
        MOBILE_PORTRAIT: {
            MOON: { x: -0.8, y: 1.2, z: 0 }, // Left side, at top
            MARS: { x: 0.3, y: 1.2, z: 0 }   // Right of Moon, at top
        },
        ANIMATION: {
            DURATION: 150,                   // ms for panel animation
            SETTLED_INTENSITY: 0.3,          // Emissive intensity when settled
            PEAK_INTENSITY: 2.0              // Emissive intensity during animation
        }
    },

    // ========== ROUTE PREFERENCES ==========
    ROUTES: {
        // City weights for route selection
        CITY_WEIGHTS: {
            AATLIS_CHANCE: 0.35,             // 35% chance to select Aatlis
            MIDTOWN_CHANCE: 0.55,            // 20% chance to select Midtown (35-55)
            AATLIS_DIRECT: 0.30,             // 30% of direct routes to/from Aatlis
            MIDTOWN_DIRECT: 0.45             // 15% of direct routes to/from Midtown (30-45)
        },
        // Graph search limits
        MAX_PATHS: 30,                       // Maximum paths to explore in BFS
        MAX_HOPS: 5                          // Maximum hops for alternate routes
    },

    // ========== VALIDATION LIMITS ==========
    VALIDATION: {
        MIN_DISTANCE_FROM_CENTER: 0.5,       // Minimum valid distance from globe center
        MAX_DISTANCE_FROM_CENTER: 2.0        // Maximum valid distance from globe center
    },

    // ========== AUTO-ROTATE SETTINGS ==========
    AUTO_ROTATE: {
        SPEED: 0.002,                        // Normal rotation speed
        RECENTER_SPEED: 0.004,               // Constant speed when recentering
        FADE_IN_THRESHOLD: 0.1,              // Start fading image at 90% complete (10% remaining)
        COMPLETE_THRESHOLD: 0.01,            // Stop recentering threshold
        DRAG_DELAY: 2000,                    // ms delay before resume after drag (event view)
        NORMAL_DELAY: 5000,                  // ms delay before resume after drag (normal)
        HOVER_RESUME_DELAY: 500              // ms delay before resume after hover
    },

    // ========== MOBILE DETECTION ==========
    MOBILE: {
        WIDTH_THRESHOLD: 768                 // px width threshold for mobile detection
    }
};

/**
 * Helper function to get model scale as Vector3-compatible object
 */
export function getModelScale(type = 'default') {
    const scale = TransportConfig.MODELS[`${type.toUpperCase()}_SCALE`] || TransportConfig.MODELS.SCALE;
    return typeof scale === 'object' ? scale : { x: scale, y: scale, z: scale };
}

/**
 * Helper function to get color configuration for vehicle type
 */
export function getVehicleColor(type) {
    const colorMap = {
        'train': { color: TransportConfig.COLORS.VEHICLE_BASE, emissive: TransportConfig.COLORS.VEHICLE_EMISSIVE },
        'plane': { color: TransportConfig.COLORS.VEHICLE_BASE, emissive: TransportConfig.COLORS.VEHICLE_EMISSIVE },
        'boat': { color: TransportConfig.COLORS.VEHICLE_BASE, emissive: TransportConfig.COLORS.VEHICLE_EMISSIVE },
        'iss': { color: TransportConfig.COLORS.ISS_BASE, emissive: TransportConfig.COLORS.ISS_EMISSIVE },
        'satellite': { color: TransportConfig.COLORS.VEHICLE_BASE, emissive: TransportConfig.COLORS.VEHICLE_EMISSIVE },
        'mars_ship': { color: TransportConfig.COLORS.MARS_SHIP_BASE, emissive: TransportConfig.COLORS.MARS_SHIP_EMISSIVE }
    };
    
    return colorMap[type.toLowerCase()] || colorMap['train'];
}
