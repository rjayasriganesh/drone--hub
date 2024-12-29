import config from './config.js';

// Set access token
Cesium.Ion.defaultAccessToken = config.CESIUM_ACCESS_TOKEN;

// Initialize Cesium viewer with enhanced graphics
const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    scene3DOnly: true,
    contextOptions: {
        webgl: {
            alpha: false
        }
    }
});

// Initialize Leaflet map with satellite view
const map = L.map('leafletMap');
L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google Maps'
}).addTo(map);

// Configure globe appearance with stars and space background
viewer.scene.skyBox = new Cesium.SkyBox({
    sources: {
        positiveX: 'https://raw.githubusercontent.com/CesiumGS/cesium/1.95/Source/Assets/Textures/SkyBox/tycho2t3_80_px.jpg',
        negativeX: 'https://raw.githubusercontent.com/CesiumGS/cesium/1.95/Source/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg',
        positiveY: 'https://raw.githubusercontent.com/CesiumGS/cesium/1.95/Source/Assets/Textures/SkyBox/tycho2t3_80_py.jpg',
        negativeY: 'https://raw.githubusercontent.com/CesiumGS/cesium/1.95/Source/Assets/Textures/SkyBox/tycho2t3_80_my.jpg',
        positiveZ: 'https://raw.githubusercontent.com/CesiumGS/cesium/1.95/Source/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg',
        negativeZ: 'https://raw.githubusercontent.com/CesiumGS/cesium/1.95/Source/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg'
    }
});

// Enable stars and lighting
viewer.scene.globe.enableLighting = true;
viewer.scene.globe.nightImageSource = 'https://raw.githubusercontent.com/CesiumGS/cesium/1.95/Source/Assets/Textures/Earth/night.jpg';
viewer.scene.moon = new Cesium.Moon();
viewer.scene.skyAtmosphere = new Cesium.SkyAtmosphere();

// Configure star brightness and atmosphere
viewer.scene.skyAtmosphere.hueShift = 0.0;
viewer.scene.skyAtmosphere.saturationShift = 0.1;
viewer.scene.skyAtmosphere.brightnessShift = 0.05;

// Add sun and configure its lighting
viewer.scene.sun = new Cesium.Sun();
viewer.scene.sun.glowFactor = 2.0;
viewer.scene.globe.enableLighting = true;

// Configure globe appearance
viewer.scene.globe.baseColor = Cesium.Color.BLACK;
viewer.scene.globe.translucency.enabled = true;
viewer.scene.globe.translucency.frontFaceAlpha = 1.0;
viewer.scene.globe.translucency.backFaceAlpha = 0.0;

// Add some distant planets (as points)
const planets = [
    { name: 'Venus', position: Cesium.Cartesian3.fromDegrees(-50, 30, 10000000) },
    { name: 'Mars', position: Cesium.Cartesian3.fromDegrees(60, -20, 15000000) },
    { name: 'Jupiter', position: Cesium.Cartesian3.fromDegrees(-120, 40, 20000000) }
];

planets.forEach(planet => {
    viewer.entities.add({
        position: planet.position,
        point: {
            pixelSize: 3,
            color: Cesium.Color.fromCssColorString('#fff9c4').withAlpha(0.8),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1e7, 1.5, 5e7, 0.3)
        },
        label: {
            text: planet.name,
            font: '12px Poppins',
            fillColor: Cesium.Color.WHITE,
            pixelOffset: new Cesium.Cartesian2(10, 0),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(1e7, 5e7)
        }
    });
});

// Add twinkling stars effect
function createTwinklingStars() {
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
        const lon = Math.random() * 360 - 180;
        const lat = Math.random() * 180 - 90;
        const distance = Math.random() * 10000000 + 10000000;
        
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, distance),
            point: {
                pixelSize: Math.random() * 2 + 1,
                color: Cesium.Color.WHITE.withAlpha(Math.random() * 0.5 + 0.5),
                scaleByDistance: new Cesium.NearFarScalar(1e7, 1, 5e7, 0.1)
            }
        });
    }
}

createTwinklingStars();

// Add star twinkling animation
let lastTime = Date.now();
viewer.scene.postRender.addEventListener(() => {
    const currentTime = Date.now();
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    viewer.entities.values.forEach(entity => {
        if (entity.point) {
            const alpha = 0.5 + Math.sin(currentTime * 0.001 + Math.random() * Math.PI) * 0.3;
            entity.point.color = Cesium.Color.WHITE.withAlpha(alpha);
        }
    });
});

// Set initial view
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
    orientation: {
        heading: 0.0,
        pitch: -Cesium.Math.PI_OVER_TWO,
        roll: 0.0
    }
});

// Earth rotation
let lastNow = Date.now();
let rotationEnabled = true;

viewer.scene.postUpdate.addEventListener(() => {
    if (rotationEnabled) {
        const now = Date.now();
        const delta = (now - lastNow) / 1000;
        lastNow = now;
        viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -delta * 0.05);
    }
});

// Search functionality
const searchInput = document.getElementById('location-search');
const searchSuggestions = document.querySelector('.search-suggestions');
const clearButton = document.querySelector('.clear-search');

// Handle search input with debouncing
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Show/hide clear button
    clearButton.style.display = query ? 'block' : 'none';

    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.length < 2) {
        searchSuggestions.style.display = 'none';
        return;
    }

    // Set new timeout for search
    searchTimeout = setTimeout(async () => {
        try {
            const results = await searchLocation(query);
            if (results.length > 0) {
                displaySearchResults(results);
            } else {
                searchSuggestions.innerHTML = '<div class="suggestion-item">No results found</div>';
                searchSuggestions.style.display = 'block';
            }
        } catch (error) {
            console.error('Search failed:', error);
            searchSuggestions.innerHTML = '<div class="suggestion-item">Search failed. Please try again.</div>';
            searchSuggestions.style.display = 'block';
        }
    }, 300);
});

// Handle enter key press
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            try {
                // Hide suggestions immediately
                searchSuggestions.style.display = 'none';
                
                const results = await searchLocation(query);
                if (results.length > 0) {
                    const firstResult = results[0];
                    handleLocationSelect(
                        parseFloat(firstResult.lat),
                        parseFloat(firstResult.lon),
                        firstResult.display_name
                    );
                    
                    // Update input value with selected location
                    searchInput.value = firstResult.display_name;
                } else {
                    showNotification('No results found for your search');
                }
            } catch (error) {
                console.error('Search failed:', error);
                showNotification('Search failed. Please try again.');
            }
        }
    }
});

// Also add a click outside handler to close suggestions
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.style.display = 'none';
    }
});

// Clear search button handler
clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.style.display = 'none';
    searchSuggestions.style.display = 'none';
});

// Enhanced search function
async function searchLocation(query) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(query)}&` +
            `limit=5&` +
            `addressdetails=1`
        );

        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}

// Display search results
function displaySearchResults(results) {
    searchSuggestions.innerHTML = results.map(result => `
        <div class="suggestion-item" data-lat="${result.lat}" data-lon="${result.lon}">
            <i class="fas fa-map-marker-alt suggestion-icon"></i>
            <div class="suggestion-content">
                <div class="suggestion-name">${result.display_name}</div>
                <div class="suggestion-details">
                    ${result.type || 'location'} • ${Number(result.lat).toFixed(4)}, ${Number(result.lon).toFixed(4)}
                </div>
            </div>
        </div>
    `).join('');
    
    searchSuggestions.style.display = 'block';

    // Add click handlers to suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            const address = item.querySelector('.suggestion-name').textContent;
            
            searchInput.value = address;
            searchSuggestions.style.display = 'none';
            handleLocationSelect(lat, lon, address);
        });
    });
}

// Handle location selection
async function handleLocationSelect(lat, lon, address) {
    try {
        rotationEnabled = false;
        showNotification('Taking you to the location...');
        
        // Start transition directly without zooming out first
        await flyToLocation(lat, lon);
        showLocationInfo(address);
        
        // Store location data
        storeLocationData({
            lat: lat,
            lon: lon,
            type: 'search',
            address: address
        });
    } catch (error) {
        console.error('Error handling location:', error);
        showNotification('Error displaying location');
    }
}

// Single optimized function for getting precise location
async function getPreciseLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        // Set shorter timeout and use high accuracy only on mobile devices
        const options = {
            enableHighAccuracy: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            timeout: 30000, // Reduced from 30000 to 5000ms
            maximumAge: 0
        };

        // First try to get a quick position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve(position);
                
                // Then try to get a more accurate position in background
                navigator.geolocation.getCurrentPosition(
                    (precisePosition) => {
                        if (precisePosition.coords.accuracy < position.coords.accuracy) {
                            handleLocationUpdate(precisePosition);
                        }
                    },
                    null,
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            },
            (error) => reject(error),
            options
        );
    });
}

// Add this new function to handle location updates
function handleLocationUpdate(position) {
    const { latitude, longitude, accuracy } = position.coords;
    
    // Update map view if accuracy is better
    flyToLocation(latitude, longitude);
    switchToSatelliteView(latitude, longitude, accuracy);
    
    // Update location info
    reverseGeocode(latitude, longitude).then(address => {
        showLocationInfo(address);
        storeLocationData({
            lat: latitude,
            lon: longitude,
            type: 'live',
            address,
            accuracy,
            timestamp: new Date().toISOString()
        });
    });
}

// Update the live location button handler
document.getElementById('live-location').addEventListener('click', async () => {
    const liveButton = document.getElementById('live-location');
    
    try {
        liveButton.disabled = true;
        liveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
        showNotification('Getting your location...');

        const position = await getPreciseLocation();
        const { latitude, longitude, accuracy } = position.coords;

        rotationEnabled = false;
        showNotification('Location found, taking you there...');

        // Get address in parallel
        const addressPromise = reverseGeocode(latitude, longitude);

        // Start the transition
        await flyToLocation(latitude, longitude);

        // Wait for address and show info
        const address = await addressPromise;
        showLocationInfo(address);

        // Store location data
        storeLocationData({
            lat: latitude,
            lon: longitude,
            type: 'live',
            address,
            accuracy,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Location error:', error);
        showNotification(error.message || 'Could not get your location');
    } finally {
        liveButton.disabled = false;
        liveButton.innerHTML = '<i class="fas fa-location-arrow"></i> Live';
    }
});

async function reverseGeocode(lat, lon) {
    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&_=${timestamp}`
        );
        
        if (!response.ok) {
            throw new Error('Geocoding service error');
        }
        
        const data = await response.json();
        if (!data || !data.display_name) {
            throw new Error('Invalid address data received');
        }
        
        return data.display_name;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return `Location (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
    }
}

// Update the flyToLocation function with more zoom levels
async function flyToLocation(lat, lon) {
    return new Promise((resolve) => {
        // Define transition steps with more levels
        const steps = [
            {
                height: 15000000, // Continent view
                duration: 1.0
            },
            {
                height: 5000000,  // Country level
                duration: 1.0
            },
            {
                height: 1000000,  // Region level
                duration: 1.0
            },
            {
                height: 250000,   // City level
                duration: 1.0
            },
            {
                height: 50000,    // District level
                duration: 1.0
            },
            {
                height: 10000,    // Neighborhood level
                duration: 1.0
            }
        ];

        let currentStep = 0;

        function executeNextStep() {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lon, lat, step.height),
                    duration: step.duration,
                    complete: () => {
                        currentStep++;
                        executeNextStep();
                    }
                });
            } else {
                // Final transition to satellite view
                setTimeout(() => {
                    switchToSatelliteView(lat, lon);
                    resolve();
                }, 500);
            }
        }

        // Start the transition sequence
        executeNextStep();
    });
}

// Improved location display
function switchToSatelliteView(lat, lon, accuracy = 20) {
    // Add fade out animation to Cesium container
    const cesiumContainer = document.getElementById('cesiumContainer');
    cesiumContainer.style.opacity = '0';
    
    setTimeout(() => {
        cesiumContainer.style.display = 'none';
        const leafletMap = document.getElementById('leafletMap');
        leafletMap.style.opacity = '0';
        leafletMap.style.display = 'block';

        // Force map to recalculate its size
        map.invalidateSize();

        // Calculate zoom level based on accuracy
        const zoomLevel = accuracy <= 50 ? 19 :
                         accuracy <= 100 ? 18 :
                         accuracy <= 500 ? 17 : 16;

        // Set view with smooth animation
        map.setView([lat, lon], zoomLevel, {
            animate: true,
            duration: 2
        });

        // Clear existing markers
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Circle) {
                map.removeLayer(layer);
            }
        });

        // Add accuracy circle with animation
        if (accuracy) {
            const circle = L.circle([lat, lon], {
                radius: accuracy,
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0,
                weight: 1
            }).addTo(map);

            setTimeout(() => {
                circle.setStyle({ fillOpacity: 0.1 });
            }, 300);
        }

        // Add marker with custom icon and pulse effect
        setTimeout(() => {
            const marker = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'location-marker',
                    html: '<div class="pulse"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);
        }, 500);

        // Fade in Leaflet map
        setTimeout(() => {
            leafletMap.style.opacity = '1';
        }, 100);
    }, 500);
}

function showLocationInfo(address) {
    const locationInfo = document.querySelector('.location-info');
    document.getElementById('location-address').textContent = address;
    locationInfo.style.display = 'block';
}

function storeLocationData(data) {
    sessionStorage.setItem('selectedLocation', JSON.stringify(data));
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Handle proceed button
document.getElementById('proceed-btn').addEventListener('click', () => {
    // Add fade out animation to entire container
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    
    // Store transition state
    sessionStorage.setItem('transitionState', 'proceeding');
    
    setTimeout(() => {
        window.location.href = 'drone.html';
    }, 500);
}); 