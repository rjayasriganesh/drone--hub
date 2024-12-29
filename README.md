# DroneHub - Intelligent Drone Management System

DroneHub is a web-based drone mission planning and control system that provides an intuitive interface for planning drone flights, managing waypoints, and monitoring missions in real-time.

## 🚀 Features

### 1. Location Selection
- Interactive 3D globe visualization
- Location search with autocomplete
- Live location detection
- Smooth transitions between views
- Satellite imagery integration

### 2. Mission Planning
- Point-and-click waypoint creation
- Drag-and-drop waypoint adjustment
- Real-time distance calculation
- Maximum range validation (200km)
- CSV import/export functionality
- Mission path visualization
- Estimated duration calculation

### 3. Tower Control
- Real-time mission monitoring
- Live drone tracking
- Dynamic path updates
- Mission progress visualization
- Drone telemetry display:
  - Battery level
  - Altitude
  - Speed
  - Signal strength
- Mission control functions:
  - Start
  - Pause/Resume
  - Abort (with return-to-home option)

### 4. Weather Integration
- Real-time weather data
- Temperature monitoring
- Wind speed tracking
- Humidity levels
- Weather conditions display

## 🛠️ Technologies Used

- **Frontend**:
  - HTML5
  - CSS3
  - JavaScript (ES6+)
  - Leaflet.js (2D mapping)
  - Cesium.js (3D globe)

- **APIs**:
  - OpenWeatherMap API (weather data)
  - Nominatim API (geocoding)
  - Esri Satellite Imagery

- **Data Management**:
  - SessionStorage (mission data)
  - CSV import/export

## 📦 Project Structure 
drone-hub/
├── assets/
│ └── images/
│ ├── drone.png
│ └── waypoint-marker.png
├── styles/
│ └── theme.css
├── index.html
├── drone.html
├── tower.html
├── main.js
├── drone.js
├── tower.js
├── weather.js
├── auth.js
├── config.js
├── styles.css
├── drone.css
└── tower.css
