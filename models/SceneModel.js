/**
 * SceneModel - Manages Three.js scene state
 * Handles scene, camera, renderer, globe, markers, and UI state
 */
export class SceneModel {
    // Constants
    static CAMERA_FOV = 45;
    static CAMERA_NEAR = 0.1;
    static CAMERA_FAR = 1000;
    static MOBILE_BREAKPOINT = 768;
    static CAMERA_POSITION_MOBILE_PORTRAIT = 5.5;
    static CAMERA_POSITION_DEFAULT = 3.5;
    static AMBIENT_LIGHT_COLOR = 0xffffff;
    static AMBIENT_LIGHT_INTENSITY = 0.6;
    static DIRECTIONAL_LIGHT_COLOR = 0xffffff;
    static DIRECTIONAL_LIGHT_INTENSITY = 0.8;
    static DIRECTIONAL_LIGHT_POSITION = { x: 5, y: 3, z: 5 };
    static BACKGROUND_COLORS = {
        GRAY: 0x0f0f0f,
        BLUE: 0x050d18
    };

    constructor() {
        // Three.js core objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.globe = null;
        this.stars = null;
        this.moonPlane = null;
        this.marsPlane = null;

        // Markers
        this.markers = [];

        // Interaction state
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotationVelocity = { x: 0, y: 0 };
        this.autoRotate = true;
        this.activeMarker = null;
        this.labelElement = null;
        this.autoRotateTimeout = null; // Store timeout reference for clearing

        // User preferences
        this.autoRotateEnabled = true;
        this.hyperloopVisible = true;
        this.eventMarker = null; // Current event marker for recentering
        this.activeFilters = new Set(); // Currently active filter selections

        // Page visibility
        this.isPageVisible = true;

        // GLTF Loader
        this.gltfLoader = null;
    }

    /**
     * Initialize Three.js scene
     * @param {HTMLElement} container - Container element
     */
    initScene(container) {
        // Scene setup
        this.scene = new THREE.Scene();
        
        // Check saved palette preference to set correct background color
        const savedPalette = localStorage.getItem('colorPalette');
        const isGray = savedPalette === 'gray';
        const bgColor = isGray ? SceneModel.BACKGROUND_COLORS.GRAY : SceneModel.BACKGROUND_COLORS.BLUE;
        console.log('Initializing scene with palette:', savedPalette || 'blue (default)', 'Background color:', '0x' + bgColor.toString(16));
        this.scene.background = new THREE.Color(bgColor);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            SceneModel.CAMERA_FOV,
            container.clientWidth / container.clientHeight,
            SceneModel.CAMERA_NEAR,
            SceneModel.CAMERA_FAR
        );
        
        // On mobile/vertical view, start more zoomed out to show Moon/Mars panels
        const isMobile = window.innerWidth <= SceneModel.MOBILE_BREAKPOINT;
        const isPortrait = container.clientHeight > container.clientWidth;
        const isMobilePortrait = isMobile && isPortrait;
        
        // Default camera position: more zoomed out on mobile portrait to show panels
        this.camera.position.z = isMobilePortrait ? SceneModel.CAMERA_POSITION_MOBILE_PORTRAIT : SceneModel.CAMERA_POSITION_DEFAULT;
        
        // Store mobile state for later use
        this.isMobilePortrait = isMobilePortrait;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        // Add lighting for normal map visualization (MeshStandardMaterial needs lighting)
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(
            SceneModel.AMBIENT_LIGHT_COLOR,
            SceneModel.AMBIENT_LIGHT_INTENSITY
        );
        this.scene.add(ambientLight);
        
        // Directional light to show normal map depth
        const directionalLight = new THREE.DirectionalLight(
            SceneModel.DIRECTIONAL_LIGHT_COLOR,
            SceneModel.DIRECTIONAL_LIGHT_INTENSITY
        );
        directionalLight.position.set(
            SceneModel.DIRECTIONAL_LIGHT_POSITION.x,
            SceneModel.DIRECTIONAL_LIGHT_POSITION.y,
            SceneModel.DIRECTIONAL_LIGHT_POSITION.z
        );
        this.scene.add(directionalLight);

        // Initialize GLTF Loader
        this.gltfLoader = new THREE.GLTFLoader();
    }

    /**
     * Get scene
     * @returns {THREE.Scene}
     */
    getScene() {
        return this.scene;
    }

    /**
     * Change scene background color
     * @param {number} colorHex - Hex color value (e.g., 0x0a1929 for blue, 0x1a1a1a for gray)
     */
    setBackgroundColor(colorHex) {
        if (this.scene) {
            this.scene.background = new THREE.Color(colorHex);
        }
    }

    /**
     * Get camera
     * @returns {THREE.PerspectiveCamera}
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get renderer
     * @returns {THREE.WebGLRenderer}
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Set globe
     * @param {THREE.Mesh} globe - Globe mesh
     */
    setGlobe(globe) {
        this.globe = globe;
    }

    /**
     * Get globe
     * @returns {THREE.Mesh}
     */
    getGlobe() {
        return this.globe;
    }


    /**
     * Set stars
     * @param {THREE.Points} stars - Stars point cloud
     */
    setStars(stars) {
        this.stars = stars;
    }

    /**
     * Get stars
     * @returns {THREE.Points}
     */
    getStars() {
        return this.stars;
    }

    /**
     * Set moon plane
     * @param {THREE.Mesh} moonPlane - Moon plane mesh
     */
    setMoonPlane(moonPlane) {
        this.moonPlane = moonPlane;
    }

    /**
     * Get moon plane
     * @returns {THREE.Mesh}
     */
    getMoonPlane() {
        return this.moonPlane;
    }

    /**
     * Set mars plane
     * @param {THREE.Mesh} marsPlane - Mars plane mesh
     */
    setMarsPlane(marsPlane) {
        this.marsPlane = marsPlane;
    }

    /**
     * Get mars plane
     * @returns {THREE.Mesh}
     */
    getMarsPlane() {
        return this.marsPlane;
    }

    /**
     * Add marker
     * @param {Object} marker - Marker object
     */
    addMarker(marker) {
        this.markers.push(marker);
    }

    /**
     * Get all markers
     * @returns {Array}
     */
    getMarkers() {
        return this.markers;
    }

    /**
     * Set dragging state
     * @param {boolean} isDragging - Dragging state
     */
    setDragging(isDragging) {
        this.isDragging = isDragging;
    }

    /**
     * Get dragging state
     * @returns {boolean}
     */
    isDraggingState() {
        return this.isDragging;
    }

    /**
     * Set previous mouse position
     * @param {Object} position - Mouse position {x, y}
     */
    setPreviousMousePosition(position) {
        this.previousMousePosition = position;
    }

    /**
     * Get previous mouse position
     * @returns {Object}
     */
    getPreviousMousePosition() {
        return this.previousMousePosition;
    }

    /**
     * Set rotation velocity
     * @param {Object} velocity - Rotation velocity {x, y}
     */
    setRotationVelocity(velocity) {
        this.rotationVelocity = velocity;
    }

    /**
     * Get rotation velocity
     * @returns {Object}
     */
    getRotationVelocity() {
        return this.rotationVelocity;
    }

    /**
     * Set auto rotate
     * @param {boolean} autoRotate - Auto rotate state
     */
    setAutoRotate(autoRotate) {
        this.autoRotate = autoRotate;
    }

    /**
     * Get auto rotate
     * @returns {boolean}
     */
    getAutoRotate() {
        return this.autoRotate;
    }

    /**
     * Set active marker
     * @param {Object} marker - Active marker
     */
    setActiveMarker(marker) {
        this.activeMarker = marker;
    }

    /**
     * Get active marker
     * @returns {Object|null}
     */
    getActiveMarker() {
        return this.activeMarker;
    }

    /**
     * Set label element
     * @param {HTMLElement} element - Label element
     */
    setLabelElement(element) {
        this.labelElement = element;
    }

    /**
     * Get label element
     * @returns {HTMLElement|null}
     */
    getLabelElement() {
        return this.labelElement;
    }

    /**
     * Set auto rotate enabled
     * @param {boolean} enabled - Auto rotate enabled state
     */
    setAutoRotateEnabled(enabled) {
        this.autoRotateEnabled = enabled;
    }

    /**
     * Get auto rotate enabled
     * @returns {boolean}
     */
    getAutoRotateEnabled() {
        return this.autoRotateEnabled;
    }

    /**
     * Set hyperloop visible
     * @param {boolean} visible - Hyperloop visible state
     */
    setHyperloopVisible(visible) {
        this.hyperloopVisible = visible;
    }

    /**
     * Get hyperloop visible
     * @returns {boolean}
     */
    getHyperloopVisible() {
        return this.hyperloopVisible;
    }

    /**
     * Set page visible
     * @param {boolean} visible - Page visible state
     */
    setPageVisible(visible) {
        this.isPageVisible = visible;
    }

    /**
     * Get page visible
     * @returns {boolean}
     */
    getPageVisible() {
        return this.isPageVisible;
    }

    /**
     * Get GLTF loader
     * @returns {THREE.GLTFLoader}
     */
    getGLTFLoader() {
        return this.gltfLoader;
    }
}

