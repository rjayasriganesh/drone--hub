// Check authentication and role
function checkAuth() {
    const userRole = sessionStorage.getItem('userRole');
    if (!userRole || userRole !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
}

checkAuth();

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
    loadSavedLocations();
});

// Initialize map
// Initialize map with Hybrid Layer
const map = L.map('admin-map').setView([0, 0], 2);

const hybridLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Hybrid'
});

hybridLayer.addTo(map);

// DDTs storage
let ddts = [];

// Map click handler for adding DDTs
let addingDDT = false;

// Add these variables at the top of your file
let watchId = null;
let userMarker = null;
let isTracking = false;
let deletedDDT = null;
let undoTimeout = null;

// Add at the top with other variables
let warehouses = [];
let addingWarehouse = false;

// Add this constant at the top of the file
const WAREHOUSE_VISIBILITY_ZOOM = 13; // Adjust this value to set the minimum zoom level for warehouse visibility

const WAREHOUSE_RANGE = 10; // 5 kilometers range

// Add after map initialization
const markerClusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        return L.divIcon({
            className: 'ddt-cluster',
            html: `<div class="cluster-marker">${childCount}</div>`,
            iconSize: [40, 40]
        });
    }
});

map.addLayer(markerClusterGroup);

document.getElementById('add-ddt-btn').addEventListener('click', () => {
    addingDDT = !addingDDT;
    const btn = document.getElementById('add-ddt-btn');
    btn.style.background = addingDDT ? '#22c55e' : '';
    map.getContainer().style.cursor = addingDDT ? 'crosshair' : '';
});

map.on('click', (e) => {
    if (addingDDT) {
        const { lat, lng } = e.latlng;
        addDDT({
            id: Date.now(),
            lat,
            lng,
            name: `DDT ${ddts.length + 1}`,
            active: true
        });
        addingDDT = false;
        document.getElementById('add-ddt-btn').style.background = '';
        map.getContainer().style.cursor = '';
    } else if (addingWarehouse) {
        const { lat, lng } = e.latlng;
        addWarehouse({
            id: Date.now(),
            lat,
            lng,
            name: `Warehouse ${warehouses.length + 1}`
        });
        addingWarehouse = false;
        document.getElementById('add-warehouse-btn').style.background = '';
        map.getContainer().style.cursor = '';
    }
});

// CSV upload handler
document.getElementById('upload-csv-btn').addEventListener('click', () => {
    document.getElementById('csv-upload').click();
});

document.getElementById('csv-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const csvData = event.target.result;
            processCSV(csvData);
        };
        reader.readAsText(file);
    }
});

function processCSV(csvData) {
    const lines = csvData.split('\n');
    lines.slice(1).forEach(line => {
        const [name, lat, lng] = line.split(',');
        if (lat && lng) {
            addDDT({
                id: Date.now() + Math.random(),
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                name: name.trim() || `DDT ${ddts.length + 1}`,
                active: true
            });
        }
    });
}

// DDT management
function addDDT(ddt) {
    ddt.rack = ddt.rack || '';
    ddt.number = ddts.length + 1;
    if (ddt.name && ddt.name.startsWith('DDT ')) {
        ddt.name = `DDT ${ddt.number}`;
    }
    ddts.push(ddt);
    addDDTToMap(ddt);
    updateDDTList();
}

function addDDTToMap(ddt) {
    const marker = L.marker([ddt.lat, ddt.lng], {
        icon: L.divIcon({
            className: 'ddt-marker',
            html: `
                <div class="ddt-point">
                    <span class="ddt-number">${ddt.number}</span>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        }),
        opacity: ddt.active ? 1 : 0.5
    });
    
    marker.on('click', () => {
        // Zoom to the DDT location
        map.setView([ddt.lat, ddt.lng], 15, {
            animate: true,
            duration: 1
        });
        showNameEditor(ddt.id);
    });
    
    marker.ddt = ddt;
    ddt.marker = marker;
    
    // Add marker to cluster group instead of directly to map
    markerClusterGroup.addLayer(marker);
}

function updateDDTList() {
    const list = document.getElementById('ddt-list');
    list.innerHTML = '';
    
    ddts.forEach(ddt => {
        const item = document.createElement('div');
        item.className = `ddt-item ${ddt.active ? '' : 'inactive'}`;
        item.innerHTML = `
            <div class="ddt-info">
                <div class="ddt-header">
                    <div class="ddt-number-badge">${ddt.number}</div>
                    <span class="ddt-name">${ddt.name}</span>
                </div>
                <div class="ddt-location">
                    <i class="fas fa-location-dot"></i>
                    <small>${ddt.lat.toFixed(6)}, ${ddt.lng.toFixed(6)}</small>
                </div>
            </div>
            <div class="ddt-actions">
                <button class="action-btn rack-btn" onclick="goToRacks(${ddt.id})" 
                    ${!ddt.active ? 'disabled' : ''} title="View Racks">
                    <i class="fas fa-layer-group"></i>
                </button>
                <button class="action-btn toggle-btn" onclick="toggleDDT(${ddt.id})" 
                    title="${ddt.active ? 'Deactivate' : 'Activate'} DDT">
                    <i class="fas fa-${ddt.active ? 'toggle-on' : 'toggle-off'}"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteDDT(${ddt.id})" 
                    ${!ddt.active ? 'disabled' : ''} title="Delete DDT">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

function editDDT(id) {
    const ddt = ddts.find(d => d.id === id);
    const newName = prompt('Enter new name for DDT:', ddt.name);
    if (newName) {
        ddt.name = newName;
        updateDDTList();
    }
}

function toggleDDT(id) {
    const ddt = ddts.find(d => d.id === id);
    if (ddt) {
        ddt.active = !ddt.active;
        if (ddt.marker) {
            ddt.marker.setOpacity(ddt.active ? 1 : 0.5);
        }
        updateDDTList();
        // Save changes to localStorage
        localStorage.setItem('ddts', JSON.stringify(ddts));
    }
}

function deleteDDT(id) {
    const index = ddts.findIndex(d => d.id === id);
    if (index !== -1) {
        deletedDDT = {
            ddt: { ...ddts[index] },
            index: index
        };
        
        // Remove from cluster group instead of map
        markerClusterGroup.removeLayer(ddts[index].marker);
        ddts.splice(index, 1);
        
        reorderDDTNumbers();
        updateDDTList();
        showUndoPopup();
        
        if (undoTimeout) {
            clearTimeout(undoTimeout);
        }
        undoTimeout = setTimeout(() => {
            hideUndoPopup();
            deletedDDT = null;
        }, 10000);
    }
}

// Save changes
document.getElementById('save-changes-btn').addEventListener('click', async () => {
    showLoading();
    try {
        localStorage.setItem('ddts', JSON.stringify(ddts.map(d => ({
            id: d.id,
            lat: d.lat,
            lng: d.lng,
            name: d.name,
            active: d.active,
            rack: d.rack
        }))));
        showNotification('Changes saved successfully!');
    } catch (error) {
        showNotification('Failed to save changes', 'error');
    } finally {
        hideLoading();
    }
});

// Load saved DDTs
const savedDDTs = localStorage.getItem('ddts');
if (savedDDTs) {
    JSON.parse(savedDDTs).forEach(d => addDDT(d));
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('username');
    window.location.href = 'login.html';
});

// Add this new function to handle rack updates
function updateDDTRack(id, rackNumber) {
    const ddt = ddts.find(d => d.id === id);
    if (ddt) {
        ddt.rack = rackNumber;
        updateDDTList();
    }
}

function showRackSelector(ddtId) {
    const ddt = ddts.find(d => d.id === ddtId);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'rack-popup';
    popup.innerHTML = `
        <h3>Select Rack</h3>
        <div class="rack-options">
            <div class="rack-option ${ddt.rack === '1' ? 'selected' : ''}" data-rack="1">
                <i class="fas fa-layer-group"></i> Rack 1
            </div>
            <div class="rack-option ${ddt.rack === '2' ? 'selected' : ''}" data-rack="2">
                <i class="fas fa-layer-group"></i> Rack 2
            </div>
            <div class="rack-option ${ddt.rack === '3' ? 'selected' : ''}" data-rack="3">
                <i class="fas fa-layer-group"></i> Rack 3
            </div>
            <div class="rack-option ${ddt.rack === '4' ? 'selected' : ''}" data-rack="4">
                <i class="fas fa-layer-group"></i> Rack 4
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Add click handlers
    const options = popup.querySelectorAll('.rack-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const rackNumber = option.dataset.rack;
            updateDDTRack(ddtId, rackNumber);
            closeRackSelector();
        });
    });
    
    // Close on overlay click
    overlay.addEventListener('click', closeRackSelector);
}

function closeRackSelector() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.rack-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

// Add this function to handle live location tracking
function toggleLiveLocation() {
    if (!isTracking) {
        startLiveTracking();
    } else {
        stopLiveTracking();
    }
}

function startLiveTracking() {
    if ("geolocation" in navigator) {
        const liveButton = document.getElementById('live-location-btn');
        liveButton.classList.add('active');
        isTracking = true;

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Create or update user marker
                if (!userMarker) {
                    userMarker = L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'selected-location-marker',
                            html: '<div class="location-point"></div>',
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        })
                    }).addTo(map);
                    
                    // Add popup to show current location
                    userMarker.bindPopup('Your Location').openPopup();
                } else {
                    userMarker.setLatLng([latitude, longitude]);
                }

                // Center map on user location
                map.setView([latitude, longitude], 15);
                
                // Check for nearby DDTs
                checkNearbyDDTs(latitude, longitude);
            },
            (error) => {
                console.error('Error getting location:', error);
                stopLiveTracking();
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

function stopLiveTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    
    const liveButton = document.getElementById('live-location-btn');
    liveButton.style.background = ''; // Reset button color
    isTracking = false;
}

// Add this in your initialization code or DOMContentLoaded event
document.getElementById('live-location-btn').addEventListener('click', toggleLiveLocation);

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
});

// Add new function to check for nearby DDTs
function checkNearbyDDTs(latitude, longitude) {
    const PROXIMITY_THRESHOLD = 0.1; // approximately 100 meters
    
    ddts.forEach(ddt => {
        const distance = calculateDistance(latitude, longitude, ddt.lat, ddt.lng);
        
        if (distance < PROXIMITY_THRESHOLD) {
            highlightDDT(ddt);
        } else {
            unhighlightDDT(ddt);
        }
    });
}

// Add helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

// Add function to highlight nearby DDT
function highlightDDT(ddt) {
    const ddtElement = document.querySelector(`[data-ddt-id="${ddt.id}"]`);
    if (ddtElement) {
        ddtElement.classList.add('nearby');
    }
    
    if (ddt.marker) {
        ddt.marker.setIcon(L.divIcon({
            className: 'ddt-marker nearby',
            html: `<div class="ddt-point"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));
    }
}

// Add function to remove highlight from DDT
function unhighlightDDT(ddt) {
    const ddtElement = document.querySelector(`[data-ddt-id="${ddt.id}"]`);
    if (ddtElement) {
        ddtElement.classList.remove('nearby');
    }
    
    if (ddt.marker) {
        ddt.marker.setIcon(L.divIcon({
            className: 'ddt-marker',
            html: `<div class="ddt-point"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        }));
    }
}

// Add function to show name editor popup
function showNameEditor(ddtId) {
    const ddt = ddts.find(d => d.id === ddtId);
    if (!ddt) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'name-popup';
    popup.innerHTML = `
        <h3>Edit DDT Name</h3>
        <div class="name-input-container">
            <input type="text" id="ddt-name-input" value="${ddt.name}" placeholder="Enter DDT name">
            <div class="name-buttons">
                <button class="save-name-btn">Save</button>
                <button class="cancel-name-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Add event listeners
    const input = popup.querySelector('#ddt-name-input');
    const saveBtn = popup.querySelector('.save-name-btn');
    const cancelBtn = popup.querySelector('.cancel-name-btn');

    saveBtn.addEventListener('click', () => {
        const newName = input.value.trim();
        if (newName) {
            ddt.name = newName;
            updateDDTList();
        }
        closeNameEditor();
    });

    cancelBtn.addEventListener('click', closeNameEditor);
    overlay.addEventListener('click', closeNameEditor);

    // Focus input
    input.focus();
    input.select();
}

function closeNameEditor() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.name-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

// Show DDT Info
document.getElementById('ddt-info-btn').addEventListener('click', () => {
    window.location.href = 'ddt-info.html';
});

function showDDTInfo() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'info-popup';
    
    // Calculate statistics
    const totalDDTs = ddts.length;
    const activeDDTs = ddts.filter(d => d.active).length;
    const rackCounts = ddts.reduce((acc, ddt) => {
        if (ddt.rack) {
            acc[ddt.rack] = (acc[ddt.rack] || 0) + 1;
        }
        return acc;
    }, {});
    
    popup.innerHTML = `
        <h3>DDT Information</h3>
        <div class="info-content">
            <p><strong>Total DDTs:</strong> ${totalDDTs}</p>
            <p><strong>Active DDTs:</strong> ${activeDDTs}</p>
            <p><strong>Inactive DDTs:</strong> ${totalDDTs - activeDDTs}</p>
            <h4>DDTs by Rack:</h4>
            <ul>
                ${Object.entries(rackCounts).map(([rack, count]) => 
                    `<li>Rack ${rack}: ${count} DDT${count !== 1 ? 's' : ''}</li>`
                ).join('')}
            </ul>
        </div>
        <button class="close-info-btn">Close</button>
    `;
    
    document.body.appendChild(popup);
    
    // Add event listeners
    const closeBtn = popup.querySelector('.close-info-btn');
    closeBtn.addEventListener('click', closeInfoPopup);
    overlay.addEventListener('click', closeInfoPopup);
}

function closeInfoPopup() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.info-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

// Add function to reorder DDT numbers
function reorderDDTNumbers() {
    ddts.forEach((ddt, index) => {
        if (ddt.name.startsWith('DDT ')) {
            ddt.name = `DDT ${index + 1}`;
            ddt.number = index + 1;
        }
    });
}

// Add function to show undo popup
function showUndoPopup() {
    // Remove existing undo popup if any
    hideUndoPopup();
    
    const popup = document.createElement('div');
    popup.className = 'undo-popup';
    popup.innerHTML = `
        <span>DDT deleted</span>
        <button class="undo-btn" onclick="undoDelete()">
            <i class="fas fa-undo"></i> Undo
        </button>
    `;
    document.body.appendChild(popup);
    
    // Animate popup
    setTimeout(() => popup.classList.add('show'), 100);
}

// Add function to hide undo popup
function hideUndoPopup() {
    const existingPopup = document.querySelector('.undo-popup');
    if (existingPopup) {
        existingPopup.classList.remove('show');
        setTimeout(() => existingPopup.remove(), 300);
    }
}

// Add function to undo deletion
function undoDelete() {
    if (deletedDDT) {
        ddts.splice(deletedDDT.index, 0, deletedDDT.ddt);
        addDDTToMap(deletedDDT.ddt);
        reorderDDTNumbers();
        updateDDTList();
        hideUndoPopup();
        
        if (undoTimeout) {
            clearTimeout(undoTimeout);
        }
        deletedDDT = null;
    }
}

// Add loading state management
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// Add search functionality
document.getElementById('ddt-search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const ddtItems = document.querySelectorAll('.ddt-item');
    
    ddtItems.forEach(item => {
        const ddtName = item.querySelector('.ddt-name').textContent.toLowerCase();
        const visible = ddtName.includes(searchTerm);
        item.style.display = visible ? 'flex' : 'none';
    });
});

// Add success notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }, 100);
}

// Add warehouse button handler
document.getElementById('add-warehouse-btn').addEventListener('click', () => {
    addingWarehouse = !addingWarehouse;
    addingDDT = false; // Disable DDT adding mode if active
    
    const warehouseBtn = document.getElementById('add-warehouse-btn');
    const ddtBtn = document.getElementById('add-ddt-btn');
    
    warehouseBtn.style.background = addingWarehouse ? '#22c55e' : '';
    ddtBtn.style.background = '';
    
    map.getContainer().style.cursor = addingWarehouse ? 'crosshair' : '';
});

// Add warehouse management functions
function addWarehouse(warehouse) {
    warehouses.push(warehouse);
    addWarehouseToMap(warehouse);
    updateWarehouseList();
    saveWarehouses();
}

function addWarehouseToMap(warehouse) {
    const currentZoom = map.getZoom();
    const marker = L.marker([warehouse.lat, warehouse.lng], {
        icon: L.divIcon({
            className: 'warehouse-marker',
            html: currentZoom >= WAREHOUSE_VISIBILITY_ZOOM ? `
                <div class="warehouse-point">
                    <i class="fas fa-warehouse"></i>
                    <span class="warehouse-name">${warehouse.name}</span>
                </div>
            ` : `<div class="warehouse-point-minimal"></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    });
    
    marker.on('click', () => {
        showWarehouseEditor(warehouse.id);
    });
    
    marker.warehouse = warehouse;
    warehouse.marker = marker;
    markerClusterGroup.addLayer(marker);
}

function showWarehouseEditor(warehouseId) {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (!warehouse) return;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    const popup = document.createElement('div');
    popup.className = 'warehouse-popup';
    popup.innerHTML = `
        <h3>Edit Warehouse</h3>
        <div class="warehouse-form">
            <input type="text" id="warehouse-name" value="${warehouse.name}" placeholder="Enter warehouse name">
            <div class="warehouse-actions">
                <button class="save-btn">Save</button>
                <button class="delete-btn">Delete</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    const saveBtn = popup.querySelector('.save-btn');
    const deleteBtn = popup.querySelector('.delete-btn');
    const cancelBtn = popup.querySelector('.cancel-btn');
    const nameInput = popup.querySelector('#warehouse-name');

    saveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName) {
            warehouse.name = newName;
            updateWarehouseMarker(warehouse);
            saveWarehouses();
        }
        closeWarehouseEditor();
    });

    deleteBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this warehouse?')) {
            deleteWarehouse(warehouse.id);
            closeWarehouseEditor();
        }
    });

    cancelBtn.addEventListener('click', closeWarehouseEditor);
    overlay.addEventListener('click', closeWarehouseEditor);
}

function closeWarehouseEditor() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.warehouse-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

function updateWarehouseMarker(warehouse) {
    if (warehouse.marker) {
        const currentZoom = map.getZoom();
        warehouse.marker.setIcon(L.divIcon({
            className: 'warehouse-marker',
            html: currentZoom >= WAREHOUSE_VISIBILITY_ZOOM ? `
                <div class="warehouse-point">
                    <i class="fas fa-warehouse"></i>
                    <span class="warehouse-name">${warehouse.name}</span>
                </div>
            ` : `<div class="warehouse-point-minimal"></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        }));
    }
}

function deleteWarehouse(id) {
    const index = warehouses.findIndex(w => w.id === id);
    if (index !== -1) {
        markerClusterGroup.removeLayer(warehouses[index].marker);
        warehouses.splice(index, 1);
        updateWarehouseList();
        saveWarehouses();
    }
}

function saveWarehouses() {
    localStorage.setItem('warehouses', JSON.stringify(warehouses.map(w => ({
        id: w.id,
        lat: w.lat,
        lng: w.lng,
        name: w.name
    }))));
}

// Load saved warehouses
const savedWarehouses = localStorage.getItem('warehouses');
if (savedWarehouses) {
    JSON.parse(savedWarehouses).forEach(w => addWarehouse(w));
}

// Update the map zoom handler
map.on('zoomend', () => {
    const currentZoom = map.getZoom();
    warehouses.forEach(warehouse => {
        if (warehouse.marker) {
            const icon = warehouse.marker.getIcon();
            const newIcon = L.divIcon({
                className: 'warehouse-marker',
                html: currentZoom >= WAREHOUSE_VISIBILITY_ZOOM ? `
                    <div class="warehouse-point">
                        <i class="fas fa-warehouse"></i>
                        <span class="warehouse-name">${warehouse.name}</span>
                    </div>
                ` : `<div class="warehouse-point-minimal"></div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            warehouse.marker.setIcon(newIcon);
        }
    });
});

// Add this function after addWarehouse function
function updateWarehouseList() {
    const list = document.getElementById('warehouse-list');
    list.innerHTML = '';
    
    warehouses.forEach(warehouse => {
        const ddtsInRange = getDDTsInRange(warehouse);
        const item = document.createElement('div');
        item.className = 'warehouse-item';
        item.innerHTML = `
            <div class="warehouse-header" onclick="toggleWarehouseDDTs(this)">
                <div class="warehouse-info">
                    <i class="fas fa-warehouse warehouse-icon"></i>
                    <span class="warehouse-name">${warehouse.name}</span>
                </div>
                <div class="warehouse-summary">
                    <span>${ddtsInRange.length} DDTs</span>
                    <i class="fas fa-chevron-down expand-icon"></i>
                </div>
            </div>
            <div class="warehouse-ddts">
                ${ddtsInRange.map(ddt => `
                    <div class="warehouse-ddt-item">
                        <div class="ddt-number-badge">${ddt.number}</div>
                        <span class="ddt-name">${ddt.name}</span>
                        <span class="ddt-distance">${calculateDistance(warehouse.lat, warehouse.lng, ddt.lat, ddt.lng).toFixed(2)} km</span>
                    </div>
                `).join('')}
                <div class="range-info">
                    <i class="fas fa-info-circle"></i> Showing DDTs within ${WAREHOUSE_RANGE} km range
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

// Add this function to get DDTs within range of a warehouse
function getDDTsInRange(warehouse) {
    return ddts.filter(ddt => {
        const distance = calculateDistance(warehouse.lat, warehouse.lng, ddt.lat, ddt.lng);
        return distance <= WAREHOUSE_RANGE;
    });
}

// Add this function to toggle the warehouse DDTs dropdown
function toggleWarehouseDDTs(header) {
    const ddtsList = header.nextElementSibling;
    const expandIcon = header.querySelector('.expand-icon');
    
    if (ddtsList.classList.contains('expanded')) {
        ddtsList.classList.remove('expanded');
        expandIcon.style.transform = 'rotate(0deg)';
    } else {
        ddtsList.classList.add('expanded');
        expandIcon.style.transform = 'rotate(180deg)';
    }
}

// Update the addWarehouse function to include updating the warehouse list
function addWarehouse(warehouse) {
    warehouses.push(warehouse);
    addWarehouseToMap(warehouse);
    updateWarehouseList();
    saveWarehouses();
}

// Update the deleteWarehouse function to include updating the warehouse list
function deleteWarehouse(id) {
    const index = warehouses.findIndex(w => w.id === id);
    if (index !== -1) {
        markerClusterGroup.removeLayer(warehouses[index].marker);
        warehouses.splice(index, 1);
        updateWarehouseList();
        saveWarehouses();
    }
}

// Add function to handle rack navigation
function goToRacks(ddtId) {
    // Store the DDT ID in session storage to access it on the racks page
    sessionStorage.setItem('currentDDT', ddtId);
    window.location.href = 'rack.html';
}

// Update the toggleDDT function
function toggleDDT(id) {
    const ddt = ddts.find(d => d.id === id);
    if (ddt) {
        ddt.active = !ddt.active;
        if (ddt.marker) {
            ddt.marker.setOpacity(ddt.active ? 1 : 0.5);
        }
        updateDDTList();
        // Save changes to localStorage
        localStorage.setItem('ddts', JSON.stringify(ddts));
    }
}