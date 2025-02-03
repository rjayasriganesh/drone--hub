document.addEventListener('DOMContentLoaded', () => {
    const ddtId = sessionStorage.getItem('currentDDT');
    if (!ddtId) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    // Get DDT data from localStorage
    const ddts = JSON.parse(localStorage.getItem('ddts') || '[]');
    const currentDDT = ddts.find(d => d.id === parseInt(ddtId));
    
    if (!currentDDT) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    // Update DDT info
    document.getElementById('ddt-name').textContent = currentDDT.name;
    document.getElementById('ddt-location').textContent = 
        `Location: ${currentDDT.lat.toFixed(6)}, ${currentDDT.lng.toFixed(6)}`;

    // Create racks grid
    const racksGrid = document.querySelector('.racks-grid');
    for (let i = 1; i <= 4; i++) {
        const rack = document.createElement('div');
        rack.className = 'rack';
        
        // Randomly set rack status for demonstration
        const isEmpty = Math.random() > 0.5;
        
        rack.innerHTML = `
            <div class="rack-number">Rack ${i}</div>
            <span class="rack-status ${isEmpty ? 'status-empty' : 'status-full'}">
                ${isEmpty ? 'Empty' : 'Full'}
            </span>
        `;
        racksGrid.appendChild(rack);
    }
}); 