document.addEventListener('DOMContentLoaded', function() {
    loadDroneInfo();
    setupSelectionHandlers();
    loadPackageInfo();
});

function loadDroneInfo() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));

    if (drone) {
        document.querySelector('.drone-info-card').innerHTML = `
            <h3><i class="fas fa-drone"></i> ${drone.name}</h3>
            <div class="drone-status">
                <p><i class="fas fa-box"></i> Package System: 
                    <span class="${drone.hasPackage ? 'text-success' : 'text-danger'}">
                        ${drone.hasPackage ? 'Enabled' : 'Disabled'}
                    </span>
                </p>
                <p><i class="fas fa-power-off"></i> Status: 
                    <span class="${drone.isActive ? 'text-success' : 'text-danger'}">
                        ${drone.isActive ? 'Active' : 'Inactive'}
                    </span>
                </p>
                <p><i class="fas fa-camera"></i> Camera: 
                    <span class="${drone.hasCamera ? 'text-success' : 'text-danger'}">
                        ${drone.hasCamera ? 'Enabled' : 'Disabled'}
                    </span>
                </p>
            </div>
        `;

        // Load existing duties if any
        if (drone.duties) {
            selectRoute(drone.duties.route);
            selectSchedule(drone.duties.schedule);
            selectPriority(drone.duties.priority);
            document.getElementById('notesArea').value = drone.duties.notes || '';
        }

        // Load route information based on packages
        if (drone.packages) {
            loadRouteInformation(drone.packages, warehouse);
        }
    }
}

function setupSelectionHandlers() {
    // Route selection
    document.querySelectorAll('.route-card').forEach(card => {
        card.addEventListener('click', () => {
            selectRoute(card.dataset.route);
        });
    });

    // Schedule selection
    document.querySelectorAll('.schedule-card').forEach(card => {
        card.addEventListener('click', () => {
            selectSchedule(card.dataset.schedule);
        });
    });

    // Priority selection
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectPriority(btn.dataset.priority);
        });
    });
}

function selectRoute(route) {
    document.querySelectorAll('.route-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.route === route);
    });
}

function selectSchedule(schedule) {
    document.querySelectorAll('.schedule-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.schedule === schedule);
    });
}

function selectPriority(priority) {
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.priority === priority);
    });
}

function saveAndReturn() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const droneIndex = drones.findIndex(d => d.id == droneId);

    if (droneIndex !== -1) {
        const selectedRoute = document.querySelector('.route-card.selected')?.dataset.route;
        const selectedSchedule = document.querySelector('.schedule-card.selected')?.dataset.schedule;
        const selectedPriority = document.querySelector('.priority-btn.selected')?.dataset.priority;

        if (!selectedRoute || !selectedSchedule || !selectedPriority) {
            alert('Please select a route, schedule, and priority level');
            return;
        }

        drones[droneIndex].isAssigned = true;
        drones[droneIndex].duties = {
            route: selectedRoute,
            schedule: selectedSchedule,
            priority: selectedPriority,
            notes: document.getElementById('notesArea').value
        };
        localStorage.setItem('availableDrones', JSON.stringify(drones));
        window.location.href = 'drone-assignment.html';
    }
}

function loadPackageInfo() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));

    if (drone && drone.packages) {
        const activePackages = drone.packages.filter(p => p.active);
        
        // Create package info section if it doesn't exist
        if (!document.querySelector('.package-info')) {
            const packageSection = document.createElement('div');
            packageSection.className = 'package-info';
            document.querySelector('.drone-info-card').appendChild(packageSection);
        }

        const packageSection = document.querySelector('.package-info');
        
        if (activePackages.length > 0) {
            packageSection.innerHTML = `
                <h3><i class="fas fa-boxes"></i> Assigned Packages</h3>
                <div class="package-list">
                    ${activePackages.map(pkg => {
                        const ddt = getDDTInfo(pkg.selectedDDT, warehouse);
                        return `
                            <div class="package-item">
                                <div class="package-header">
                                    <h4>Package ${pkg.number}</h4>
                                    <span class="status-badge">Active</span>
                                </div>
                                <div class="ddt-details">
                                    <p><i class="fas fa-route"></i> ${ddt.name}</p>
                                    <p><i class="fas fa-map-marker-alt"></i> ${ddt.location}</p>
                                    <p><i class="fas fa-clock"></i> Est. Time: ${ddt.estimatedTime} min</p>
                                    <p><i class="fas fa-road"></i> Distance: ${ddt.distance.toFixed(1)} km</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            packageSection.innerHTML = `
                <div class="no-packages">
                    <i class="fas fa-box-open"></i>
                    <p>No packages assigned</p>
                </div>
            `;
        }
    }
}

function getDDTInfo(ddtId, warehouse) {
    // This should match the DDT generation logic from package-system.js
    const locations = [
        { name: 'City Center', lat: warehouse.lat + 0.01, lng: warehouse.lng + 0.01 },
        { name: 'Shopping Mall', lat: warehouse.lat - 0.01, lng: warehouse.lng + 0.02 },
        { name: 'Business District', lat: warehouse.lat + 0.02, lng: warehouse.lng - 0.01 },
        { name: 'Residential Area', lat: warehouse.lat - 0.015, lng: warehouse.lng - 0.015 },
        { name: 'Industrial Park', lat: warehouse.lat + 0.025, lng: warehouse.lng + 0.02 }
    ];

    const location = locations[ddtId - 1];
    const distance = calculateDistance(warehouse.lat, warehouse.lng, location.lat, location.lng);
    
    return {
        id: ddtId,
        name: `DDT-${ddtId.toString().padStart(3, '0')}`,
        location: location.name,
        distance: distance,
        estimatedTime: Math.round(distance * 3)
    };
}

function loadRouteInformation(packages, warehouse) {
    const activePackages = packages.filter(p => p.active);
    const routeSection = document.querySelector('.route-options');
    
    if (activePackages.length > 0) {
        routeSection.innerHTML = activePackages.map(pkg => {
            const ddt = getDDTInfo(pkg.selectedDDT, warehouse);
            return `
                <div class="route-card" data-route="package${pkg.number}">
                    <div class="route-icon">
                        <div class="package-number">${pkg.number}</div>
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="route-details">
                        <div class="route-header">
                            <h4>Package ${pkg.number} Route</h4>
                            <span class="distance-badge">${ddt.distance.toFixed(1)} km</span>
                        </div>
                        <div class="route-info">
                            <p><i class="fas fa-map-marker-alt"></i> ${ddt.location}</p>
                            <p><i class="fas fa-clock"></i> Est. Time: ${ddt.estimatedTime} min</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        routeSection.innerHTML = `
            <div class="no-routes">
                <i class="fas fa-route"></i>
                <p>No package routes available</p>
                <p class="sub-text">Please assign packages in the package system first</p>
            </div>
        `;
    }
} 