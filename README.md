# Timeline Overwatch

An interactive 3D timeline visualization of the Overwatch universe, featuring a globe-based interface for exploring events, characters, and locations.

## Features

- **3D Interactive Globe**: Navigate events on Earth, Moon, and Mars
- **Event Management**: View and manage timeline events with detailed information
- **Transport System**: Visualize connections between cities via planes, trains, and boats
- **Music Player**: Background music with multiple tracks
- **Color Palettes**: Switch between blue and gray color schemes
- **Event Filtering**: Filter events by heroes and factions
- **Responsive Design**: Works on desktop and mobile devices

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Timeline-Overwatch
```

2. Install dependencies (if any):
```bash
npm install
```

3. Start the local server:
```bash
npm start
```

4. Open your browser and navigate to:
- `http://localhost:8000/` - Main application (index.html)
- `http://localhost:8000/main` - Main application (alternative)
- `http://localhost:8000/test` - Test page with component loader
- `http://localhost:8000/map` - Map view

## GitHub Pages Deployment

The application is configured to work on GitHub Pages. Follow these steps to deploy:

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch**: `main` (or `master`)
   - **Folder**: `/ (root)`
4. Click **Save**

### 2. Verify Files

Make sure these files are in your repository root:
- `index.html` - Main entry point (GitHub Pages will serve this at the root URL)
- `404.html` - Fallback page for 404 errors
- All asset folders (`data/`, `Misc/`, `Music/`, `Icons/`, etc.)
- All JavaScript files (`script.js`, `test-loader.js`, `js/`, `controllers/`, `models/`, `views/`, `utils/`)
- `styles.css` - Main stylesheet

### 3. Access Your Site

After enabling GitHub Pages, your site will be available at:
```
https://<your-username>.github.io/<repository-name>/
```

For example:
```
https://username.github.io/Timeline-Overwatch/
```

### 4. Important Notes for GitHub Pages

- **Edit Mode**: The application automatically detects when running on GitHub Pages and disables edit/delete functionality for events. This prevents users from modifying data on the live site.
- **Local Storage**: User preferences (color palette, music state) are saved in browser localStorage and will persist across sessions.
- **Event Data**: Events are loaded from `data/events.json`. On GitHub Pages, users can view events but cannot edit them (edit buttons are hidden).
- **File Paths**: All file paths are relative, so they work correctly on both localhost and GitHub Pages.

## Project Structure

```
Timeline-Overwatch/
├── index.html          # Main entry point (GitHub Pages)
├── main.html           # Main application page
├── test.html           # Test/development page
├── map.html            # Map view
├── 404.html            # GitHub Pages 404 handler
├── styles.css          # Main stylesheet
├── script.js           # Main application script
├── test-loader.js      # Component loader
├── server.js            # Local development server
├── package.json         # Node.js dependencies
├── data/                # JSON data files
│   ├── events.json
│   ├── locations.json
│   └── connections.json
├── controllers/         # Application controllers
├── models/              # Data models
├── views/               # View components
├── utils/               # Utility functions
├── js/                  # Additional JavaScript
├── Music/               # Music files
├── Music Icons/         # Music icons
├── Event Images/        # Event images
├── Icons/               # Application icons
├── Misc/                # Miscellaneous assets
└── Models3D/            # 3D model files
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Note: Some features may require modern browser support for ES6 modules and WebGL.

## License

Original work by Blizzard Entertainment. This project is for educational/non-commercial use.

## Credits

- **Three.js**: 3D graphics library
- **Overwatch**: Original game and lore by Blizzard Entertainment

