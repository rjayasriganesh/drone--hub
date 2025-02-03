import config from './config.js';

// Get mission data from session storage
const missionWaypoints = JSON.parse(sessionStorage.getItem('missionWaypoints'));
const missionInfo = JSON.parse(sessionStorage.getItem('missionInfo'));

// Ensure the map container exists and is styled
document.addEventListener('DOMContentLoaded', function() {
    const mapContainer = document.getElementById('admin-map');
    if (!mapContainer) {
        const container = document.createElement('div');
        container.id = 'admin-map';
        container.style.width = '100%';
        container.style.height = '500px';
        document.body.appendChild(container);
    }
    initializeMission();
});

// Initialize map with Hybrid Layer
const map = L.map('admin-map').setView([0, 0], 2);

const hybridLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Hybrid'
});

hybridLayer.addTo(map);

let droneMarker;
let currentPath;
let missionStarted = false;
let missionPaused = false;
let currentWaypointIndex = 0;
let simulationSpeed = 50; // meters per second
let completedPaths = [];

// Initialize mission display
function initializeMission() {
    if (!missionWaypoints || missionWaypoints.length < 2) {
        alert('No valid mission data found');
        return;
    }

    // Set initial map view
    const firstPoint = missionWaypoints[0];
    map.setView([firstPoint.latitude, firstPoint.longitude], 15);

    // Add waypoint markers
    missionWaypoints.forEach((wp, index) => {
        L.marker([wp.latitude, wp.longitude], {
            icon: createWaypointIcon(index + 1)
        }).addTo(map);
    });

    // Draw initial path
    drawPath();

    // Add drone marker at first waypoint
    droneMarker = L.marker([firstPoint.latitude, firstPoint.longitude], {
        icon: createDroneIcon()
    }).addTo(map);

    // Update mission info
    updateMissionInfo();
}

function calculateIconSize(baseSize) {
    const zoom = map.getZoom();
    const scale = Math.pow(1.2, zoom - 15); // 1.2x size increase per zoom level, normalized around zoom level 15
    const size = Math.round(baseSize * Math.min(Math.max(scale, 0.5), 3)); // Limit scaling between 0.5x and 3x
    return size;
}

function createWaypointIcon(number) {
    const baseSize = 28;
    const size = calculateIconSize(baseSize);
    return L.divIcon({
        className: 'waypoint-marker',
        html: `<div style="background-color: #2563eb; color: white; border-radius: 50%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: ${size/2}px;">${number}</div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

function createDroneIcon() {
    const baseSize = 40;
    const size = calculateIconSize(baseSize);
    return L.divIcon({
        className: 'drone-marker',
        html: `
            <div class="drone-icon" style="width: ${size}px; height: ${size}px;">
                <img src="assets/images/drone.png" alt="drone">
            </div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

function drawPath() {
    // Clear existing completed paths
    completedPaths.forEach(path => {
        if (path) map.removeLayer(path);
    });
    completedPaths = [];

    // Draw remaining path segments
    for (let i = currentWaypointIndex; i < missionWaypoints.length - 1; i++) {
        const coordinates = [
            [missionWaypoints[i].latitude, missionWaypoints[i].longitude],
            [missionWaypoints[i + 1].latitude, missionWaypoints[i + 1].longitude]
        ];
        
        const pathSegment = L.polyline(coordinates, {
            color: '#2563eb',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(map);
        
        completedPaths.push(pathSegment);
    }
}

function updateMissionInfo() {
    document.getElementById('total-distance').textContent = `${missionInfo.totalDistance.toFixed(2)} km`;
    document.getElementById('est-duration').textContent = `${missionInfo.estimatedDuration} min`;
    document.getElementById('waypoint-count').textContent = missionWaypoints.length;
}

function startMission() {
    if (missionStarted) return;
    missionStarted = true;
    missionPaused = false;

    document.getElementById('start-mission').disabled = true;
    document.getElementById('pause-mission').disabled = false;
    document.getElementById('abort-mission').disabled = false;

    flyToNextWaypoint();
}

function flyToNextWaypoint() {
    if (missionPaused || currentWaypointIndex >= missionWaypoints.length - 1) {
        if (currentWaypointIndex >= missionWaypoints.length - 1) {
            completeMission();
        }
        return;
    }

    const currentWP = missionWaypoints[currentWaypointIndex];
    const nextWP = missionWaypoints[currentWaypointIndex + 1];
    
    // Calculate distance and duration
    const distance = map.distance(
        [currentWP.latitude, currentWP.longitude],
        [nextWP.latitude, nextWP.longitude]
    );
    const duration = (distance / simulationSpeed) * 1000; // Convert to milliseconds

    // Animate drone movement
    animateDrone(
        [currentWP.latitude, currentWP.longitude],
        [nextWP.latitude, nextWP.longitude],
        duration
    );
}

function animateDrone(start, end, duration) {
    const startTime = Date.now();
    const startLatLng = L.latLng(start);
    const endLatLng = L.latLng(end);

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate current position
        const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * progress;
        const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * progress;
        
        // Update drone position
        droneMarker.setLatLng([lat, lng]);

        // Calculate bearing for drone rotation
        const bearing = calculateBearing(startLatLng, endLatLng);
        rotateDrone(bearing);

        // Update progress and status
        updateProgress((currentWaypointIndex + progress) / (missionWaypoints.length - 1) * 100);
        updateDroneStatus(progress);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Remove completed path segment
            if (completedPaths[0]) {
                map.removeLayer(completedPaths[0]);
                completedPaths.shift();
            }
            
            // Mark waypoint as completed
            updateWaypointAppearance(currentWaypointIndex);
            
            currentWaypointIndex++;
            flyToNextWaypoint();
        }
    }

    animate();
}

function calculateBearing(start, end) {
    const startLat = start.lat * Math.PI / 180;
    const startLng = start.lng * Math.PI / 180;
    const endLat = end.lat * Math.PI / 180;
    const endLng = end.lng * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
             Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function rotateDrone(bearing) {
    const droneIcon = document.querySelector('.drone-marker i');
    if (droneIcon) {
        droneIcon.style.transform = `rotate(${bearing}deg)`;
    }
}

function updateProgress(percentage) {
    document.getElementById('mission-progress').style.width = `${percentage}%`;
    document.getElementById('progress-percentage').textContent = `${Math.round(percentage)}%`;
}

function updateDroneStatus(progress) {
    // Simulate battery drain
    const battery = 100 - (currentWaypointIndex + progress) / missionWaypoints.length * 20;
    document.getElementById('battery-level').textContent = `${Math.round(battery)}%`;

    // Simulate altitude changes
    const altitude = 100 + Math.sin(progress * Math.PI) * 20;
    document.getElementById('current-altitude').textContent = `${Math.round(altitude)}m`;

    // Update current speed
    document.getElementById('current-speed').textContent = `${simulationSpeed * 3.6} km/h`;
}

function completeMission() {
    document.getElementById('status-text').textContent = 'Mission Complete';
    document.getElementById('status-indicator').style.background = 'var(--success-color)';
    
    // Reset controls
    document.getElementById('start-mission').disabled = true;
    document.getElementById('pause-mission').disabled = true;
    document.getElementById('abort-mission').disabled = true;
}

// Event listeners
document.getElementById('start-mission').addEventListener('click', startMission);

document.getElementById('pause-mission').addEventListener('click', () => {
    missionPaused = !missionPaused;
    const pauseBtn = document.getElementById('pause-mission');
    pauseBtn.innerHTML = missionPaused ? 
        '<i class="fas fa-play"></i> Resume' : 
        '<i class="fas fa-pause"></i> Pause';
    
    if (!missionPaused) {
        flyToNextWaypoint();
    }
});

document.getElementById('abort-mission').addEventListener('click', () => {
    if (confirm('Are you sure you want to abort the mission?')) {
        window.location.href = 'drone.html';
    }
});

// Initialize mission when page loads
initializeMission();

// CSV upload handling
document.getElementById('csv-upload').addEventListener('change', handleCSVUpload);

async function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        if (!text.trim()) {
            throw new Error('CSV file is empty');
        }

        const waypoints = parseCSV(text);
        
        if (validateWaypoints(waypoints)) {
            // Show preview of changes
            showWaypointPreview(waypoints);
        }
    } catch (error) {
        showNotification(`CSV Error: ${error.message}`, 'error');
        // Reset file input
        event.target.value = '';
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    const waypoints = [];
    
    // Validate header
    const header = lines[0].toLowerCase().trim().split(',');
    if (!header.includes('latitude') || !header.includes('longitude')) {
        throw new Error('CSV must contain Latitude and Longitude columns');
    }
    
    // Get column indexes
    const latIndex = header.indexOf('latitude');
    const lonIndex = header.indexOf('longitude');
    const numIndex = header.indexOf('number');
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(val => val.trim());
        const latitude = parseFloat(values[latIndex]);
        const longitude = parseFloat(values[lonIndex]);
        const number = numIndex !== -1 ? parseInt(values[numIndex]) : i;
        
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error(`Invalid coordinates at line ${i + 1}`);
        }
        
        waypoints.push({
            number,
            latitude,
            longitude
        });
    }
    
    // Sort waypoints by number if number column exists
    if (numIndex !== -1) {
        waypoints.sort((a, b) => a.number - b.number);
    }
    
    return waypoints;
}

function validateWaypoints(waypoints) {
    if (waypoints.length < 2) {
        showNotification('CSV must contain at least 2 waypoints', 'error');
        return false;
    }
    
    // Check if coordinates are within valid ranges
    for (const wp of waypoints) {
        if (wp.latitude < -90 || wp.latitude > 90 || 
            wp.longitude < -180 || wp.longitude > 180) {
            showNotification(`Invalid coordinates for waypoint ${wp.number}`, 'error');
            return false;
        }
    }
    
    // Check for duplicate numbers if they exist
    const numbers = waypoints.map(wp => wp.number);
    if (new Set(numbers).size !== numbers.length) {
        showNotification('Duplicate waypoint numbers found in CSV', 'error');
        return false;
    }
    
    return true;
}

function calculateMissionInfo(waypoints) {
    let totalDistance = 0;
    
    for (let i = 1; i < waypoints.length; i++) {
        const distance = map.distance(
            [waypoints[i-1].latitude, waypoints[i-1].longitude],
            [waypoints[i].latitude, waypoints[i].longitude]
        );
        totalDistance += distance;
    }
    
    // Convert to kilometers
    totalDistance = totalDistance / 1000;
    
    // Estimate duration (assuming average speed of 30 km/h)
    const estimatedDuration = Math.ceil((totalDistance / 30) * 60);
    
    return {
        totalDistance,
        estimatedDuration
    };
}

// Add notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showWaypointPreview(newWaypoints) {
    // Clear existing preview if any
    clearPreviewLayers();
    
    // Create preview markers and path
    const previewMarkers = newWaypoints.map((wp, index) => {
        return L.marker([wp.latitude, wp.longitude], {
            icon: createPreviewWaypointIcon(index + 1)
        }).addTo(map);
    });

    const previewPath = L.polyline(
        newWaypoints.map(wp => [wp.latitude, wp.longitude]),
        {
            color: '#60a5fa',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10'
        }
    ).addTo(map);

    // Show confirmation dialog
    showConfirmationDialog(newWaypoints, previewMarkers, previewPath);
}

function createPreviewWaypointIcon(number) {
    return L.divIcon({
        className: 'waypoint-marker preview',
        html: `<div>${number}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

function showConfirmationDialog(newWaypoints, previewMarkers, previewPath) {
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3>Confirm New Waypoints</h3>
            <p>Replace current mission with:</p>
            <ul class="waypoint-summary">
                <li>Total waypoints: ${newWaypoints.length}</li>
                <li>Distance: ${calculateMissionInfo(newWaypoints).totalDistance.toFixed(2)} km</li>
                <li>Est. duration: ${calculateMissionInfo(newWaypoints).estimatedDuration} min</li>
            </ul>
            <div class="dialog-buttons">
                <button class="confirm-btn">Confirm</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Handle confirmation
    dialog.querySelector('.confirm-btn').addEventListener('click', () => {
        applyNewWaypoints(newWaypoints);
        clearPreviewLayers();
        dialog.remove();
    });

    // Handle cancellation
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        clearPreviewLayers();
        dialog.remove();
    });
}

function clearPreviewLayers() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer.options.icon.options.className.includes('preview')) {
            map.removeLayer(layer);
        }
        if (layer instanceof L.Polyline && layer.options.color === '#60a5fa') {
            map.removeLayer(layer);
        }
    });
}

function applyNewWaypoints(newWaypoints) {
    // Store new waypoints
    sessionStorage.setItem('missionWaypoints', JSON.stringify(newWaypoints));
    
    // Calculate and store new mission info
    const newMissionInfo = calculateMissionInfo(newWaypoints);
    sessionStorage.setItem('missionInfo', JSON.stringify(newMissionInfo));
    
    // Show success notification
    showNotification('Waypoints updated successfully', 'info');
    
    // Reload the page to reinitialize with new data
    location.reload();
}

// Add this new function to update waypoint appearance
function updateWaypointAppearance(index) {
    // Remove the completed waypoint marker
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            const position = layer.getLatLng();
            const waypoint = missionWaypoints[index];
            if (waypoint && 
                position.lat === waypoint.latitude && 
                position.lng === waypoint.longitude) {
                map.removeLayer(layer);
            }
        }
    });
}

// Add zoom handler to update icon sizes
map.on('zoomend', () => {
    // Update drone marker size
    if (droneMarker) {
        droneMarker.setIcon(createDroneIcon());
    }

    // Update waypoint marker sizes
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && !layer.options.icon.options.className.includes('drone-marker')) {
            const number = layer.getElement().innerText;
            layer.setIcon(createWaypointIcon(number));
        }
    });
});

// Add rack button handler
document.getElementById('rack-mission').addEventListener('click', () => {
    // Store current mission state if needed
    const missionState = {
        waypoints: missionWaypoints,
        currentIndex: currentWaypointIndex,
        progress: document.getElementById('mission-progress').style.width
    };
    sessionStorage.setItem('missionState', JSON.stringify(missionState));
    
    // Navigate to rack selection page
    window.location.href = 'rack.html';
});

// Check for selected rack when page loads
document.addEventListener('DOMContentLoaded', () => {
    const selectedRack = sessionStorage.getItem('selectedRack');
    if (selectedRack) {
        // Update UI to show selected rack
        const rackButton = document.getElementById('rack-mission');
        rackButton.innerHTML = `
            <i class="fas fa-layer-group"></i> Rack ${selectedRack}
        `;
        rackButton.classList.add('selected');
        // Clear the selection from session storage
        sessionStorage.removeItem('selectedRack');
    }
});