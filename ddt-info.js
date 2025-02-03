// Check authentication
function checkAuth() {
    const userRole = sessionStorage.getItem('userRole');
    if (!userRole || userRole !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
}

checkAuth();

// Load DDTs from localStorage
const ddts = JSON.parse(localStorage.getItem('ddts')) || [];

// Populate DDT list
function populateDDTList() {
    const ddtList = document.getElementById('ddt-list');
    ddtList.innerHTML = '';

    ddts.forEach(ddt => {
        const ddtItem = document.createElement('div');
        ddtItem.className = 'ddt-item';
        ddtItem.innerHTML = `
            <div class="ddt-name">${ddt.name}</div>
            <small>Rack: ${ddt.rack || 'Not assigned'}</small>
        `;
        ddtItem.addEventListener('click', () => showDDTDetails(ddt));
        ddtList.appendChild(ddtItem);
    });
}

// Show DDT details
function showDDTDetails(ddt) {
    // Update selected state in list
    document.querySelectorAll('.ddt-item').forEach(item => {
        item.classList.remove('selected');
        if (item.querySelector('.ddt-name').textContent === ddt.name) {
            item.classList.add('selected');
        }
    });

    // Show rack status
    updateRackStatus(ddt);

    // Fetch weather data
    fetchWeather(ddt.lat, ddt.lng);
}

// Update rack status
function updateRackStatus(ddt) {
    const racksContainer = document.getElementById('racks-container');
    racksContainer.innerHTML = '';

    // Simulate rack status (you should replace this with actual data)
    const rackStatus = {
        1: { status: 'full', capacity: '100%' },
        2: { status: 'partial', capacity: '60%' },
        3: { status: 'empty', capacity: '0%' },
        4: { status: 'partial', capacity: '45%' }
    };

    for (let i = 1; i <= 4; i++) {
        const rack = document.createElement('div');
        const status = rackStatus[i];
        rack.className = `rack ${status.status}`;
        rack.innerHTML = `
            <h4>Rack ${i}</h4>
            <div class="capacity">${status.capacity}</div>
        `;
        racksContainer.appendChild(rack);
    }
}

// Update the weather info display
async function fetchWeather(lat, lon) {
    const apiKey = '5cf838f25da8c4ea7c02910504ebd661';
    const weatherInfo = document.getElementById('weather-info');
    weatherInfo.innerHTML = '<div class="loading">Loading weather data...</div>';
    
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        const data = await response.json();
        
        weatherInfo.innerHTML = `
            <div class="weather-header">
                <h3>Current Weather</h3>
                <div class="weather-icon">
                    <img src="http://openweathermap.org/img/w/${data.weather[0].icon}.png" alt="Weather icon">
                </div>
            </div>
            <div class="weather-details">
                <div class="weather-item">
                    <i class="fas fa-temperature-high"></i>
                    <div class="weather-value">${Math.round(data.main.temp)}°C</div>
                    <div class="weather-label">Temperature</div>
                </div>
                <div class="weather-item">
                    <i class="fas fa-wind"></i>
                    <div class="weather-value">${data.wind.speed} m/s</div>
                    <div class="weather-label">Wind Speed</div>
                </div>
                <div class="weather-item">
                    <i class="fas fa-tint"></i>
                    <div class="weather-value">${data.main.humidity}%</div>
                    <div class="weather-label">Humidity</div>
                </div>
                <div class="weather-item">
                    <i class="fas fa-cloud"></i>
                    <div class="weather-value">${data.weather[0].description}</div>
                    <div class="weather-label">Conditions</div>
                </div>
            </div>
        `;
    } catch (error) {
        weatherInfo.innerHTML = `
            <div class="weather-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to fetch weather data</p>
            </div>
        `;
        console.error('Error fetching weather:', error);
    }
}

// Initialize the page
populateDDTList(); 