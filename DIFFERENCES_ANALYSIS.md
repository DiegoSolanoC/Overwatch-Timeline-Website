# Code Differences Analysis
## Overwatch Timeline Website - Original vs Refactored Copy

This document identifies all differences between the original codebase and the refactored copy, grouped by relation.

## Quick Summary

### Major Changes
1. **Directory Reorganization**: All source code moved into `src/` directory
2. **EventManager Refactoring**: Single 167k+ character file split into 1 manager + 17 service classes
3. **CSS Modularization**: Single 4000+ line CSS file split into 12 organized files
4. **File Renames**: `test-loader.js` → `src/app/component-loader.js`
5. **New Assets**: Added `events/` and `factions/` image directories

### Statistics
- **JavaScript Files**: 1 large file → 18 focused classes
- **CSS Files**: 1 file → 12 organized files
- **New Services**: 17 service classes created
- **Directory Structure**: Flat → Organized `src/` hierarchy

### Impact
- ✅ Better code organization and maintainability
- ✅ Improved separation of concerns
- ✅ Enhanced scalability and testability
- ✅ Modern service-oriented architecture pattern

---

## 1. DIRECTORY STRUCTURE REORGANIZATION

### 1.1 Source Code Organization
**Original Structure:**
```
/
├── js/
│   ├── EventManager.js
│   └── page-init.js
├── controllers/
├── models/
├── views/
├── utils/
└── helpers/
```

**Refactored Structure:**
```
/
└── src/
    ├── app/
    │   ├── component-loader.js (was test-loader.js)
    │   └── page-init.js
    ├── controllers/
    ├── models/
    ├── views/
    ├── utils/
    ├── helpers/
    ├── managers/
    │   └── EventManager.js
    └── services/
        ├── CityLookupService.js
        ├── EventDataService.js
        ├── EventDragDropService.js
        ├── EventEditService.js
        ├── EventFormService.js
        ├── EventInitService.js
        ├── EventInteractionService.js
        ├── EventListenerService.js
        ├── EventRenderService.js
        ├── FilterService.js
        ├── GlitchTextService.js
        ├── GlobeSyncService.js
        ├── ImagePathService.js
        ├── LocationService.js
        ├── MusicManager.js
        ├── SidebarService.js
        └── SoundEffectsManager.js
```

**Key Changes:**
- All source code moved into `src/` directory
- New `src/managers/` directory for manager classes
- New `src/services/` directory for service classes
- `js/` folder contents moved to `src/app/` and `src/managers/`

---

## 2. EVENTMANAGER REFACTORING

### 2.1 File Split
**Original:**
- `js/EventManager.js` - Single monolithic file (~167,000+ characters)

**Refactored:**
- `src/managers/EventManager.js` - Smaller coordinator class
- Functionality split into 17 service classes in `src/services/`:
  1. **EventDataService.js** - Data loading, saving, location data management
  2. **EventRenderService.js** - DOM rendering of events
  3. **EventEditService.js** - CRUD operations for events
  4. **EventFormService.js** - Form management and validation
  5. **EventDragDropService.js** - Drag and drop functionality
  6. **EventListenerService.js** - Event listener setup
  7. **EventInteractionService.js** - User interactions with events
  8. **EventInitService.js** - Initialization logic
  9. **LocationService.js** - Location-related operations
  10. **CityLookupService.js** - City lookup functionality
  11. **ImagePathService.js** - Image path resolution
  12. **GlobeSyncService.js** - Synchronization with globe
  13. **GlitchTextService.js** - Glitch text effects
  14. **FilterService.js** - Filtering functionality
  15. **MusicManager.js** - Music panel management
  16. **SidebarService.js** - Sidebar functionality
  17. **SoundEffectsManager.js** - Sound effects management

### 2.2 Architecture Pattern
**Original:**
- Monolithic class with all functionality in one file
- Direct method calls within the class

**Refactored:**
- Service-oriented architecture with dependency injection
- EventManager acts as coordinator, delegates to services
- Services use `setEventManager()` pattern for dependency injection
- Clear separation of concerns

---

## 3. CSS ORGANIZATION

### 3.1 File Structure
**Original:**
- `styles.css` - Single file (~4,000+ lines)

**Refactored:**
- `styles/` directory with organized structure:
  ```
  styles/
  ├── animations.css
  ├── base.css
  ├── layout.css
  ├── main.css (main entry point)
  ├── mobile.css
  ├── variables.css
  └── components/
      ├── event-manager.css
      ├── globe.css
      ├── hero.css
      ├── modals.css
      ├── panels.css
      └── sidebar.css
  ```
- `styles.css` still exists (likely for backward compatibility or legacy support)

### 3.2 HTML References
**Original:**
```html
<link rel="stylesheet" href="styles.css?v=5">
```

**Refactored:**
```html
<link rel="stylesheet" href="styles/main.css?v=6">
```

---

## 4. FILE RENAMES AND MOVES

### 4.1 JavaScript Files
| Original Path | Refactored Path | Notes |
|--------------|----------------|-------|
| `test-loader.js` | `src/app/component-loader.js` | Renamed for clarity |
| `js/page-init.js` | `src/app/page-init.js` | Moved to src/app |
| `js/EventManager.js` | `src/managers/EventManager.js` | Moved to managers directory |

### 4.2 Other Files
- `test-loader.js` → `src/app/component-loader.js` (same content, different location)
- All controller, model, view, utils, helpers moved to `src/` subdirectories

---

## 5. HTML FILE CHANGES

### 5.1 Script Loading Order
**Original (main.html):**
```html
<script type="module" src="test-loader.js"></script>
<script src="script.js"></script>
<script src="js/page-init.js"></script>
```

**Refactored (main.html):**
```html
<script type="module" src="src/app/component-loader.js"></script>
<!-- Load services (17 service files) -->
<script src="src/services/SoundEffectsManager.js"></script>
<script src="src/services/GlitchTextService.js"></script>
<script src="src/services/EventDataService.js"></script>
<script src="src/services/LocationService.js"></script>
<script src="src/services/EventRenderService.js"></script>
<script src="src/services/EventEditService.js"></script>
<script src="src/services/EventFormService.js"></script>
<script src="src/services/EventDragDropService.js"></script>
<script src="src/services/EventListenerService.js"></script>
<script src="src/services/EventInteractionService.js"></script>
<script src="src/services/EventInitService.js"></script>
<script src="src/services/CityLookupService.js"></script>
<script src="src/services/ImagePathService.js"></script>
<script src="src/services/GlobeSyncService.js"></script>
<script src="src/services/MusicManager.js"></script>
<script src="src/services/FilterService.js"></script>
<script src="src/services/SidebarService.js"></script>
<script src="script.js"></script>
<script src="src/app/page-init.js"></script>
```

### 5.2 CSS References
- All HTML files updated to reference `styles/main.css` instead of `styles.css`
- Version number incremented from `v=5` to `v=6`

---

## 6. ASSET ORGANIZATION

### 6.1 Image Directories
**Original:**
```
assets/images/
├── heroes/
├── icons/
├── maps/
├── menu/
└── misc/
```

**Refactored:**
```
assets/images/
├── events/          [NEW]
├── factions/        [NEW]
├── heroes/
├── icons/           [Additional icons]
├── maps/
├── menu/
└── misc/
```

**New Assets:**
- `assets/images/events/` - Event-specific images
- `assets/images/factions/` - Faction images (00Overwatch.png through 22Phreaks.png)

### 6.2 Audio Directories
**Original:**
```
assets/audio/
├── music/
└── sfx/
```

**Refactored:**
```
assets/audio/
└── sfx/             [music/ folder removed from assets/audio]
```

**Note:** Music files may have been moved or reorganized (music images still exist in `assets/images/music/`)

---

## 7. MISSING FILES

### 7.1 Files Present in Original but Not in Copy
- `test-loader.js` (moved/renamed to `src/app/component-loader.js`)

### 7.2 Files Present in Copy but Not in Original
- All files in `src/services/` directory (17 new service files)
- All files in `src/managers/` directory
- `styles/` directory structure
- `assets/images/events/` directory
- `assets/images/factions/` directory

---

## 8. CODE PATTERNS AND ARCHITECTURE

### 8.1 Dependency Injection Pattern
**Refactored Version Uses:**
```javascript
// Service pattern with dependency injection
class EventManager {
    constructor() {
        this.dataService = window.EventDataService || null;
        this.renderService = window.EventRenderService || null;
        if (this.renderService) {
            this.renderService.setEventManager(this);
        }
        // ... more services
    }
}
```

### 8.2 Service Initialization
**Refactored services follow pattern:**
```javascript
class SomeService {
    constructor() {
        this.eventManager = null;
    }
    
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }
}
```

---

## 9. FUNCTIONALITY EXTRACTION SUMMARY

### 9.1 From EventManager.js Extracted:
1. **Data Management** → `EventDataService.js`
   - Loading events from JSON/localStorage
   - Saving events
   - Location data management
   - Hero/faction data management

2. **Rendering** → `EventRenderService.js`
   - DOM rendering of event lists
   - Pagination rendering
   - Event item creation

3. **User Interactions** → Multiple Services:
   - `EventEditService.js` - Edit/delete operations
   - `EventFormService.js` - Form handling
   - `EventDragDropService.js` - Drag and drop
   - `EventListenerService.js` - Event listeners
   - `EventInteractionService.js` - Click/interaction handlers

4. **Supporting Services**:
   - `LocationService.js` - Location operations
   - `CityLookupService.js` - City lookup
   - `ImagePathService.js` - Image paths
   - `GlobeSyncService.js` - Globe synchronization
   - `GlitchTextService.js` - Text effects
   - `FilterService.js` - Filtering
   - `MusicManager.js` - Music panel
   - `SidebarService.js` - Sidebar
   - `SoundEffectsManager.js` - Sound effects

---

## 10. SUMMARY OF CHANGES BY CATEGORY

### Category 1: Code Organization
- ✅ All source code moved to `src/` directory
- ✅ Services extracted to `src/services/`
- ✅ Managers separated to `src/managers/`
- ✅ App initialization code in `src/app/`

### Category 2: Code Modularity
- ✅ EventManager split from 1 file to 1 manager + 17 services
- ✅ CSS split from 1 file to 12 organized files
- ✅ Clear separation of concerns

### Category 3: File Structure
- ✅ Consistent directory organization
- ✅ Logical grouping of related files
- ✅ Better maintainability

### Category 4: Asset Management
- ✅ Additional image categories (events, factions)
- ✅ Reorganized audio structure

### Category 5: HTML Integration
- ✅ Updated script loading order
- ✅ Updated CSS references
- ✅ Service dependencies explicitly loaded

---

## 11. COMPATIBILITY NOTES

### 11.1 Backward Compatibility
- `styles.css` still exists in refactored version (may be for compatibility)
- `script.js` remains at root level in both versions
- Core functionality preserved, just reorganized

### 11.2 Breaking Changes
- Script paths changed (requires HTML updates)
- CSS path changed (requires HTML updates)
- Service dependencies must be loaded in correct order

---

## CONCLUSION

The refactored copy represents a significant architectural improvement:
- **Better organization**: All code in `src/` directory
- **Improved modularity**: Large files split into focused services
- **Enhanced maintainability**: Clear separation of concerns
- **Scalability**: Easier to add new features/services
- **Testability**: Services can be tested independently

The refactoring follows modern JavaScript patterns with service-oriented architecture and dependency injection, making the codebase more maintainable and easier to understand.
