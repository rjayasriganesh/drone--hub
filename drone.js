import config from './config.js';

// Get selected location from session storage
const selectedLocation = JSON.parse(sessionStorage.getItem('selectedLocation'));

// Initialize map with satellite layer
const map = L.map('map').setView(
    selectedLocation ? [selectedLocation.lat, selectedLocation.lon] : [0, 0],
    selectedLocation ? 15 : 2
);

// Add satellite layer
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

// Store waypoints and markers
let waypoints = [];
let markers = [];

// Add this constant at the top of the file
const MAX_DISTANCE = 200; // Maximum distance in kilometers

// Custom marker icon with number
function createNumberedIcon(number) {
    return L.divIcon({
        className: 'waypoint-marker',
        html: `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${number}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

// Add click handler to map
map.on('click', (e) => {
    // Calculate potential new total distance before adding waypoint
    const potentialWaypoint = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };
    
    const potentialDistance = calculatePotentialDistance(potentialWaypoint);
    
    if (potentialDistance > MAX_DISTANCE) {
        showDistanceWarning(potentialDistance);
        return;
    }

    const number = waypoints.length + 1;
    const marker = L.marker(e.latlng, {
        icon: createNumberedIcon(number),
        draggable: true
    }).addTo(map);
    
    // Handle marker drag with distance check
    marker.on('dragend', () => {
        const position = marker.getLatLng();
        const originalPosition = { lat: waypoints[number - 1].lat, lng: waypoints[number - 1].lng };
        
        // Calculate potential distance with new position
        waypoints[number - 1].lat = position.lat;
        waypoints[number - 1].lng = position.lng;
        const newTotalDistance = calculateTotalDistance();
        
        if (newTotalDistance > MAX_DISTANCE) {
            // Revert the position if it exceeds limit
            waypoints[number - 1].lat = originalPosition.lat;
            waypoints[number - 1].lng = originalPosition.lng;
            marker.setLatLng([originalPosition.lat, originalPosition.lng]);
            showDistanceWarning(newTotalDistance);
        } else {
            updateWaypointsList();
            updatePath();
            updateMissionInfo();
        }
    });
    
    waypoints.push({
        number,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        marker
    });
    
    markers.push(marker);
    updateWaypointsList();
    updatePath();
    updateMissionInfo();
});

// Handle zoom events for overview mode
map.on('zoomend', () => {
    const zoomLevel = map.getZoom();
    const zoomInfo = document.getElementById('zoom-info');
    
    if (zoomLevel < 10 && waypoints.length > 0) {
        zoomInfo.style.display = 'flex';
        document.getElementById('total-points').textContent = waypoints.length;
    } else {
        zoomInfo.style.display = 'none';
    }
});

// Draw path between waypoints
let pathLine;
function updatePath() {
    if (pathLine) {
        map.removeLayer(pathLine);
    }
    
    if (waypoints.length > 1) {
        const coordinates = waypoints.map(wp => [wp.lat, wp.lng]);
        pathLine = L.polyline(coordinates, {
            color: '#2563eb',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(map);
        
        // Update zoom info if needed
        const zoomLevel = map.getZoom();
        const zoomInfo = document.getElementById('zoom-info');
        if (zoomLevel < 10) {
            zoomInfo.style.display = 'flex';
            document.getElementById('total-points').textContent = waypoints.length;
        }
    } else {
        document.getElementById('zoom-info').style.display = 'none';
    }
}

// Update waypoints list in sidebar
function updateWaypointsList() {
    const container = document.getElementById('waypoints-container');
    container.innerHTML = '';
    
    let runningDistance = 0;
    
    waypoints.forEach((wp, index) => {
        // Calculate running distance
        if (index > 0) {
            runningDistance += map.distance(
                [waypoints[index-1].lat, waypoints[index-1].lng],
                [wp.lat, wp.lng]
            ) / 1000;
        }
        
        const item = document.createElement('div');
        item.className = 'waypoint-item';
        
        // Add warning class if this waypoint causes distance to exceed limit
        if (runningDistance > MAX_DISTANCE) {
            item.classList.add('distance-warning');
        }
        
        item.innerHTML = `
            <div class="number">${wp.number}</div>
            <div class="coordinates">
                ${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}
                ${runningDistance > MAX_DISTANCE ? 
                    `<div class="distance-warning-text">Exceeds ${MAX_DISTANCE}km limit</div>` 
                    : ''}
            </div>
            <button class="delete-waypoint" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(item);
    });
    
    // Add delete button handlers
    document.querySelectorAll('.delete-waypoint').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            deleteWaypoint(index);
        });
    });
    
    document.getElementById('points-count').textContent = waypoints.length;
}

// Delete waypoint function
function deleteWaypoint(index) {
    // Remove the marker from the map
    map.removeLayer(waypoints[index].marker);
    
    // Remove the waypoint from the array
    waypoints.splice(index, 1);
    
    // Renumber remaining waypoints
    waypoints.forEach((wp, i) => {
        wp.number = i + 1;
        // Update marker icon with new number
        wp.marker.setIcon(createNumberedIcon(i + 1));
    });
    
    // Update the path
    updatePath();
    
    // Update the list
    updateWaypointsList();
    
    // Update mission info
    updateMissionInfo();
}

// Calculate mission info
function updateMissionInfo() {
    const totalDistance = calculateTotalDistance();
    const estimatedDuration = calculateEstimatedDuration(totalDistance);
    
    document.getElementById('total-distance').textContent = `${totalDistance.toFixed(2)} km`;
    document.getElementById('est-duration').textContent = `${estimatedDuration} min`;
}

function calculateTotalDistance() {
    if (waypoints.length < 2) return 0;
    
    let distance = 0;
    for (let i = 1; i < waypoints.length; i++) {
        distance += map.distance(
            [waypoints[i-1].lat, waypoints[i-1].lng],
            [waypoints[i].lat, waypoints[i].lng]
        );
    }
    return distance / 1000; // Convert to kilometers
}

function calculateEstimatedDuration(distance) {
    const averageSpeed = 40; // km/h
    return Math.ceil((distance / averageSpeed) * 60); // Convert to minutes
}

// Clear points handler
document.getElementById('clear-points').addEventListener('click', () => {
    if (waypoints.length === 0) return;
    
    if (confirm('Are you sure you want to clear all waypoints?')) {
        waypoints.forEach(wp => map.removeLayer(wp.marker));
        if (pathLine) map.removeLayer(pathLine);
        waypoints = [];
        markers = [];
        updateWaypointsList();
        updateMissionInfo();
    }
});

// Export CSV handler
document.getElementById('export-csv').addEventListener('click', () => {
    if (waypoints.length === 0) {
        alert('No waypoints to export');
        return;
    }
    
    const csv = [
        'Number,Latitude,Longitude',
        ...waypoints.map(wp => `${wp.number},${wp.lat},${wp.lng}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mission_waypoints.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
});

// Start mission handler
document.getElementById('start-mission').addEventListener('click', () => {
    if (waypoints.length < 2) {
        alert('Please add at least 2 waypoints before starting the mission');
        return;
    }
    
    // Store mission data
    sessionStorage.setItem('missionWaypoints', JSON.stringify(
        waypoints.map(wp => ({
            number: wp.number,
            latitude: wp.lat,
            longitude: wp.lng
        }))
    ));
    
    // Store mission info
    sessionStorage.setItem('missionInfo', JSON.stringify({
        totalDistance: calculateTotalDistance(),
        estimatedDuration: calculateEstimatedDuration(calculateTotalDistance())
    }));
    
    // Redirect to tower control
    window.location.href = 'tower.html';
});

// Add these new helper functions
function calculatePotentialDistance(newPoint) {
    if (waypoints.length === 0) return 0;
    
    // Create a temporary array with the new point
    const tempWaypoints = [...waypoints, { lat: newPoint.lat, lng: newPoint.lng }];
    
    let distance = 0;
    for (let i = 1; i < tempWaypoints.length; i++) {
        distance += map.distance(
            [tempWaypoints[i-1].lat, tempWaypoints[i-1].lng],
            [tempWaypoints[i].lat, tempWaypoints[i].lng]
        );
    }
    return distance / 1000; // Convert to kilometers
}

function showDistanceWarning(distance) {
    const warningMessage = `Warning: Total route distance (${distance.toFixed(2)} km) would exceed the maximum limit of ${MAX_DISTANCE} km`;
    
    // Create and show warning notification
    const notification = document.createElement('div');
    notification.className = 'notification warning';
    notification.textContent = warningMessage;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Add this function to fetch weather data
async function fetchWeatherData(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${config.OPENWEATHER_API_KEY}`
        );
        if (!response.ok) throw new Error('Weather data fetch failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

// Add these functions for weather toggle
function setupWeatherToggle() {
    const weatherToggle = document.getElementById('weather-toggle');
    const weatherPanel = document.querySelector('.weather-panel');
    const closeWeather = document.querySelector('.close-weather');

    weatherToggle.addEventListener('click', () => {
        weatherPanel.classList.add('show');
        weatherToggle.style.opacity = '0';
        weatherToggle.style.pointerEvents = 'none';
    });

    closeWeather.addEventListener('click', () => {
        weatherPanel.classList.remove('show');
        weatherToggle.style.opacity = '1';
        weatherToggle.style.pointerEvents = 'all';
    });
}

// Update the updateWeatherPanel function
function updateWeatherPanel(weatherData) {
    if (!weatherData) return;

    const weatherPanel = document.querySelector('.weather-panel');
    
    document.getElementById('temperature').textContent = `${Math.round(weatherData.main.temp)}°C`;
    document.getElementById('wind-speed').textContent = `${Math.round(weatherData.wind.speed * 3.6)} km/h`;
    document.getElementById('humidity').textContent = `${weatherData.main.humidity}%`;
    document.getElementById('conditions').textContent = weatherData.weather[0].main;

    // Initialize weather toggle functionality
    setupWeatherToggle();
}

// Update the DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    
    // Initialize map with fade in
    setTimeout(() => {
        container.style.opacity = '1';
        
        // If coming from main page with a selected location
        if (selectedLocation) {
            // Add marker for selected location with animation
            setTimeout(async () => {
                const locationMarker = L.marker([selectedLocation.lat, selectedLocation.lon], {
                    icon: L.divIcon({
                        className: 'selected-location-marker',
                        html: '<div class="location-point"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(map);

                // Add accuracy circle with animation
                const circle = L.circle([selectedLocation.lat, selectedLocation.lon], {
                    radius: selectedLocation.accuracy || 100,
                    color: '#2563eb',
                    fillColor: '#2563eb',
                    fillOpacity: 0,
                    weight: 1
                }).addTo(map);

                setTimeout(() => {
                    circle.setStyle({ fillOpacity: 0.1 });
                }, 300);

                // Add tooltip with animation
                if (selectedLocation.address) {
                    setTimeout(() => {
                        locationMarker.bindTooltip(selectedLocation.address, {
                            permanent: false,
                            direction: 'top'
                        }).openTooltip();
                    }, 1000);
                }

                // Fetch and display weather data
                const weatherData = await fetchWeatherData(selectedLocation.lat, selectedLocation.lon);
                updateWeatherPanel(weatherData);
            }, 500);
        }
    }, 100);
}); 