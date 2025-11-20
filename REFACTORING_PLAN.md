# Globe.js Refactoring Plan - MVC & OOD Architecture

## Current State
- **File**: `globe.js` (3,402 lines)
- **Structure**: Monolithic file with mixed concerns
- **Goal**: Split into organized MVC modules following OOD principles

## Proposed Architecture

### 1. **Model Layer** (Data & State Management)

#### `data/locations.json`
- Cities array (Overwatch locations)
- Airports array
- Seaports array
- **Estimated reduction**: ~400 lines

#### `data/connections.json`
- Main connections (train routes)
- Secondary connections
- Seaport connections
- **Estimated reduction**: ~300 lines

#### `models/DataModel.js` (~200 lines)
- Loads and manages location/connection data from JSON
- Provides getter methods for cities, airports, seaports
- Filters and validates data

#### `models/TransportModel.js` (~400 lines)
- Manages train/plane/boat arrays
- Route graphs (routeGraph, boatRouteGraph)
- Route reservations (routeReservations, boatRouteReservations)
- Route curves storage
- State management for transport systems

#### `models/SceneModel.js` (~300 lines)
- Three.js scene, camera, renderer
- Globe mesh and materials
- Markers array
- Stars/background
- Scene state (autoRotate, hyperloopVisible, etc.)

### 2. **View Layer** (Rendering)

#### `views/GlobeView.js` (~500 lines)
- Globe initialization and texture loading
- City marker rendering (`addCityMarkers`)
- Seaport marker rendering (`addSeaportMarkers`)
- Connection line rendering (`addConnectionLines`, `addSecondaryConnectionLines`, `addSeaportConnectionLines`)
- Starfield rendering (`addStarfield`)
- Arc creation utilities (`createArcBetweenPoints`)

#### `views/TransportView.js` (~400 lines)
- Train rendering and updates
- Plane rendering and updates
- Boat rendering and updates
- Trail segment creation and management
  - `createTrailSegment` (planes)
  - `createBoatTrailSegment` (boats)
  - `updateTrailSegments`
  - `updateBoatTrailSegments`
- Color calculations (`getTrainColor`)

#### `views/UIView.js` (~200 lines)
- City label display (`showCityLabel`, `hideCityLabel`, `updateLabelPosition`)
- Button toggles (auto-rotate, hyperloop)
- Visibility management (`updateHyperloopVisibility`)

### 3. **Controller Layer** (Business Logic)

#### `controllers/RouteController.js` (~500 lines)
- Route graph building (`buildRouteGraph`, `buildBoatRouteGraph`)
- Multi-stop route finding (`findMultiStopRoute`, `findMultiStopBoatRoute`)
- Alternate route finding (`findAlternateRoute`)
- Route availability checking (`isRouteAvailable`, `isBoatRouteAvailable`)
- Route reservation management (`reserveRoute`, `releaseRoute`, `reserveBoatRoute`, `releaseBoatRoute`)
- Route key generation (`getRouteKey`)
- Distance calculations (`calculateRouteDistance`)

#### `controllers/TransportController.js` (~600 lines)
- Train creation (`createTrain`, `createMultiStopTrain`)
- Plane creation (`createPlane`)
- Boat creation (`createBoat`, `createMultiStopBoat`)
- Transport updates (`updateTrains`, `updatePlanes`, `updateBoats`)
- Spawning logic (`spawnTrainsRandomly`, `spawnPlanesRandomly`, `spawnBoatsRandomly`)
- Color updates (`updateTrainColor`)
- Marker state management (`setMarkerWaiting`)

#### `controllers/InteractionController.js` (~300 lines)
- Mouse controls (`onMouseDown`, `onMouseMove`, `onMouseUp`)
- Touch controls (`onTouchStart`, `onTouchMove`)
- Wheel/zoom controls (`onWheel`)
- Marker click handling (`onMarkerClick`)
- Control setup (`setupControls`)

#### `controllers/GlobeController.js` (~400 lines)
- Main initialization (`initGlobe`)
- Animation loop (`animate`)
- Page visibility tracking (`setupPageVisibilityTracking`)
- Auto-rotate toggle (`setupAutoRotateToggle`)
- Window resize handling (`onWindowResize`)
- Coordinate conversion utilities (`latLonToVector3`)
- Main orchestration and coordination

### 4. **Utilities**

#### `utils/Constants.js` (~50 lines)
- Debug flags (`DEBUG_PHANTOM_WAGONS`)
- Configuration constants
- Default values

## File Structure
```
Timeline Overwatch/
├── index.html
├── globe.js (reduced to ~200 lines - just initialization)
├── data/
│   ├── locations.json
│   └── connections.json
├── models/
│   ├── DataModel.js
│   ├── TransportModel.js
│   └── SceneModel.js
├── views/
│   ├── GlobeView.js
│   ├── TransportView.js
│   └── UIView.js
├── controllers/
│   ├── GlobeController.js
│   ├── TransportController.js
│   ├── RouteController.js
│   └── InteractionController.js
└── utils/
    └── Constants.js
```

## Benefits
1. **Separation of Concerns**: Each class has a single responsibility
2. **Maintainability**: Easier to find and modify specific functionality
3. **Testability**: Individual components can be tested in isolation
4. **Reusability**: Models and utilities can be reused
5. **Readability**: Smaller, focused files are easier to understand
6. **Data Management**: JSON files make it easy to update locations/connections

## Estimated Line Reductions
- Original: 3,402 lines
- After refactoring:
  - `globe.js`: ~200 lines (main entry point)
  - JSON files: ~700 lines (data extraction)
  - Model classes: ~900 lines (3 files)
  - View classes: ~1,100 lines (3 files)
  - Controller classes: ~1,800 lines (4 files)
  - Utils: ~50 lines
  - **Total**: ~4,750 lines (includes structure/imports, but better organized)
  - **Net organization improvement**: Code is now modular and maintainable

## Implementation Order
1. Extract data to JSON files
2. Create Model classes
3. Create View classes
4. Create Controller classes
5. Update main `globe.js` to use modules
6. Update `index.html` to load modules
7. Test and verify functionality

## Notes
- All classes will use ES6 modules (import/export)
- `index.html` will need `<script type="module">` for the main entry point
- Maintain backward compatibility with existing functionality
- Each class will be 200-600 lines (following user preference)
- Follow strict MVC separation: Models = data, Views = rendering, Controllers = logic



