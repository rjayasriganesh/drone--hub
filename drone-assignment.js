document.addEventListener('DOMContentLoaded', function() {
    loadSelectedWarehouse();
    initializeDrones();
});

function loadSelectedWarehouse() {
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    if (warehouse) {
        document.querySelector('.selected-warehouse').innerHTML = `
            <h3><i class="fas fa-warehouse"></i> ${warehouse.name}</h3>
            <p><i class="fas fa-location-dot"></i> ${warehouse.cityName}</p>
        `;
    }
}

function initializeDrones() {
    const droneGrid = document.getElementById('drone-grid');
    const savedDrones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    
    // Create 10 drones if none exist
    const drones = savedDrones.length ? savedDrones : Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Drone ${i + 1}`,
        hasPackage: false,
        isActive: false,
        hasCamera: false,
        isAssigned: false
    }));

    droneGrid.innerHTML = drones.map(drone => `
        <div class="drone-card" data-drone-id="${drone.id}">
            <div class="drone-header">
                <div class="drone-icon">
                    <i class="fas fa-drone"></i>
                </div>
                <div class="drone-name">${drone.name}</div>
            </div>
            <div class="drone-controls">
                <div class="control-buttons">
                    <button class="control-btn package-btn ${drone.hasPackage ? 'active' : ''}"
                            onclick="updateDroneStatus(${drone.id}, 'hasPackage', !${drone.hasPackage})">
                        <i class="fas fa-box"></i>
                        Package System
                    </button>
                    <button class="control-btn status-btn ${drone.isActive ? 'active' : ''}"
                            onclick="updateDroneStatus(${drone.id}, 'isActive', !${drone.isActive})">
                        <i class="fas fa-power-off"></i>
                        Active Status
                    </button>
                    <button class="control-btn camera-btn ${drone.hasCamera ? 'active' : ''}"
                            onclick="updateDroneStatus(${drone.id}, 'hasCamera', !${drone.hasCamera})">
                        <i class="fas fa-camera"></i>
                        Camera System
                    </button>
                </div>
                <button class="assign-btn ${drone.isAssigned ? 'assigned' : ''}"
                        onclick="assignDeliveryDuties(${drone.id})">
                    <i class="fas fa-tasks"></i>
                    ${drone.isAssigned ? 'Modify Assignment' : 'Assign Duties'}
                </button>
            </div>
        </div>
    `).join('');
}

function updateDroneStatus(droneId, property, value) {
    if (property === 'hasPackage') {
        // Navigate to package system page
        localStorage.setItem('selectedDroneId', droneId);
        window.location.href = 'package-system.html';
        return;
    }
    
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const droneIndex = drones.findIndex(d => d.id === droneId);
    
    if (droneIndex === -1) {
        // If drone doesn't exist in storage, create new drones array
        const newDrones = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Drone ${i + 1}`,
            hasPackage: false,
            isActive: false,
            hasCamera: false,
            isAssigned: false
        }));
        newDrones[droneId - 1][property] = value;
        localStorage.setItem('availableDrones', JSON.stringify(newDrones));
    } else {
        // Update existing drone
        drones[droneIndex][property] = value;
        localStorage.setItem('availableDrones', JSON.stringify(drones));
    }
    
    // Refresh the display
    initializeDrones();
}

function assignDeliveryDuties(droneId) {
    // Store the selected drone ID
    localStorage.setItem('selectedDroneId', droneId);
    // Navigate to the delivery duties page
    window.location.href = 'delivery-duties.html';
}

function saveDronesAndReturn() {
    window.location.href = 'drone.html';
} 