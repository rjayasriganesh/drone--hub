document.addEventListener('DOMContentLoaded', function() {
    loadInfo();
    setupPackageHandlers();
});

function loadInfo() {
    const droneId = localStorage.getItem('selectedDroneId');
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);

    if (drone && warehouse) {
        // Display drone info
        document.querySelector('.drone-info').innerHTML = `
            <h3><i class="fas fa-drone"></i> ${drone.name}</h3>
            <div class="drone-status">
                <p><i class="fas fa-power-off"></i> Status: 
                    <span class="${drone.isActive ? 'text-success' : 'text-danger'}">
                        ${drone.isActive ? 'Active' : 'Inactive'}
                    </span>
                </p>
            </div>
        `;

        // Display warehouse info
        document.querySelector('.warehouse-info').innerHTML = `
            <h3><i class="fas fa-warehouse"></i> ${warehouse.name}</h3>
            <p><i class="fas fa-location-dot"></i> ${warehouse.cityName}</p>
        `;

        // Load existing package configurations if any
        if (drone.packages) {
            loadPackageConfigurations(drone.packages);
        }
    }
}

function setupPackageHandlers() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const packageCard = this.closest('.package-card');
            const ddtSelection = packageCard.querySelector('.ddt-selection');
            
            this.classList.toggle('active');
            if (this.classList.contains('active')) {
                this.innerHTML = '<i class="fas fa-power-off"></i><span>Active</span>';
                ddtSelection.classList.remove('hidden');
                loadDDTs(packageCard.dataset.package);
            } else {
                this.innerHTML = '<i class="fas fa-power-off"></i><span>Activate</span>';
                ddtSelection.classList.add('hidden');
            }
        });
    });
}

function loadDDTs(packageNumber) {
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    // Fetch DDTs near the warehouse
    fetchNearbyDDTs(warehouse.lat, warehouse.lng).then(ddts => {
        const ddtList = document.querySelector(`.package-card[data-package="${packageNumber}"] .ddt-list`);
        ddtList.innerHTML = ddts.map(ddt => `
            <div class="ddt-item" data-ddt-id="${ddt.id}">
                <div class="ddt-header">
                    <h4>${ddt.name}</h4>
                    <span class="distance-badge">${ddt.distance.toFixed(1)} km</span>
                </div>
                <div class="ddt-details">
                    <p>${ddt.description}</p>
                    <div class="ddt-info">
                        <span><i class="fas fa-map-marker-alt"></i> ${ddt.location}</span>
                        <span><i class="fas fa-clock"></i> ${ddt.estimatedTime} min</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for DDT selection
        ddtList.querySelectorAll('.ddt-item').forEach(item => {
            item.addEventListener('click', function() {
                ddtList.querySelectorAll('.ddt-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    });
}

async function fetchNearbyDDTs(warehouseLat, warehouseLng) {
    // For demonstration, we'll generate DDTs around the warehouse location
    // In a real application, this would be an API call to your backend
    const ddts = [];
    const locations = [
        { name: 'City Center', lat: warehouseLat + 0.01, lng: warehouseLng + 0.01 },
        { name: 'Shopping Mall', lat: warehouseLat - 0.01, lng: warehouseLng + 0.02 },
        { name: 'Business District', lat: warehouseLat + 0.02, lng: warehouseLng - 0.01 },
        { name: 'Residential Area', lat: warehouseLat - 0.015, lng: warehouseLng - 0.015 },
        { name: 'Industrial Park', lat: warehouseLat + 0.025, lng: warehouseLng + 0.02 }
    ];

    locations.forEach((loc, index) => {
        const distance = calculateDistance(warehouseLat, warehouseLng, loc.lat, loc.lng);
        if (distance <= 5) { // Only include DDTs within 5km
            ddts.push({
                id: index + 1,
                name: `DDT-${(index + 1).toString().padStart(3, '0')}`,
                location: loc.name,
                distance: distance,
                description: `Delivery route through ${loc.name}`,
                estimatedTime: Math.round(distance * 3), // Rough estimate: 3 min per km
                coordinates: { lat: loc.lat, lng: loc.lng }
            });
        }
    });

    return ddts.sort((a, b) => a.distance - b.distance);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI/180);
}

function loadPackageConfigurations(packages) {
    packages.forEach(pkg => {
        const packageCard = document.querySelector(`.package-card[data-package="${pkg.number}"]`);
        if (pkg.active) {
            const toggleBtn = packageCard.querySelector('.toggle-btn');
            toggleBtn.click(); // This will trigger the click handler and load DDTs
            
            // Select the previously selected DDT if any
            if (pkg.selectedDDT) {
                setTimeout(() => {
                    const ddtItem = packageCard.querySelector(`.ddt-item[data-ddt-id="${pkg.selectedDDT}"]`);
                    if (ddtItem) ddtItem.click();
                }, 100);
            }
        }
    });
}

function saveAndReturn() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const droneIndex = drones.findIndex(d => d.id == droneId);

    if (droneIndex !== -1) {
        const packages = [];
        document.querySelectorAll('.package-card').forEach(card => {
            const packageNumber = card.dataset.package;
            const isActive = card.querySelector('.toggle-btn').classList.contains('active');
            const selectedDDT = card.querySelector('.ddt-item.selected')?.dataset.ddtId;

            if (isActive && !selectedDDT) {
                alert(`Please select a DDT for Package ${packageNumber}`);
                return;
            }

            packages.push({
                number: packageNumber,
                active: isActive,
                selectedDDT: selectedDDT
            });
        });

        drones[droneIndex].packages = packages;
        drones[droneIndex].hasPackage = packages.some(p => p.active);
        localStorage.setItem('availableDrones', JSON.stringify(drones));
        window.location.href = 'drone-assignment.html';
    }
} 