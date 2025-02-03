document.addEventListener('DOMContentLoaded', function() {
    loadWarehouses();
});

function loadWarehouses() {
    const warehouses = JSON.parse(localStorage.getItem('warehouses') || '[]');
    const warehouseGrid = document.getElementById('warehouse-grid');
    
    if (warehouses.length === 0) {
        warehouseGrid.innerHTML = `
            <div class="no-warehouses">
                <h2>No Warehouses Available</h2>
                <p>Please add warehouses in the admin dashboard first.</p>
            </div>
        `;
        return;
    }

    warehouseGrid.innerHTML = warehouses.map(warehouse => `
        <div class="warehouse-card" data-id="${warehouse.id}">
            <div class="warehouse-icon">
                <i class="fas fa-warehouse"></i>
            </div>
            <div class="warehouse-name">${warehouse.cityName}</div>
            <div class="warehouse-details">
                <div class="warehouse-address">
                    <i class="fas fa-map-marker-alt"></i> ${warehouse.name}
                </div>
                <div class="warehouse-location">
                    <i class="fas fa-location-dot"></i> 
                    Lat: ${warehouse.lat.toFixed(4)}<br>
                    Lng: ${warehouse.lng.toFixed(4)}
                </div>
            </div>
            <button class="select-button" onclick="selectWarehouse(${warehouse.id})">
                Select Warehouse
            </button>
        </div>
    `).join('');
}

function selectWarehouse(warehouseId) {
    const warehouses = JSON.parse(localStorage.getItem('warehouses') || '[]');
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
    
    if (selectedWarehouse) {
        // Store selected warehouse in localStorage
        localStorage.setItem('selectedWarehouse', JSON.stringify(selectedWarehouse));
        // Return to drone management page
        window.location.href = 'drone.html';
    }
} 