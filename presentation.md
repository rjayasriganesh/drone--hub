# ShadowFly DroneHub Architecture Presentation

## System Overview
```mermaid
graph TD
    A[Login] --> B[Index]
    B --> C[Admin Dashboard]
    B --> D[Drone Operations]
    B --> E[Tower Monitoring]
    C --> F[DDT Management]
    C --> G[Warehouse Racks]
    D --> H[Warehouse Selection]
    H --> I[Drone Assignment]
    I --> J[Delivery Planning]
    J --> K[Package System]
    K --> E
```

---

## Core Components

### Authentication Layer
- JWT-based session management
- Role-based access control
- Secure cookie storage
- Session timeout handling

### Admin Dashboard Features
- Real-time map visualization
- CSV data import pipeline
- Warehouse capacity monitoring
- Drone fleet status overview

---

## Drone Workflow Architecture
```mermaid
sequenceDiagram
    User->>+API: Warehouse Selection
    API->>+Scheduler: Drone Availability Check
    Scheduler->>+Inventory: Package Validation
    Inventory->>-Scheduler: Stock Confirm
    Scheduler->>-API: Assignment Token
    API->>-User: Drone Assignment UI
```

---

## Key Technical Decisions

1. **State Management**
   - Redux-style centralized store
   - Route-specific state hydration
   - Offline capability with service workers

2. **Performance Optimization**
   - WebGL-based 3D visualization
   - Websocket streaming for telemetry
   - Bundle splitting by route modules

3. **Safety Features**
   - Geofencing validation
   - Collision avoidance algorithms
   - Emergency landing protocols
```

---

## Deployment Architecture
```mermaid
graph LR
    A[CDN] --> B[Edge Nodes]
    B --> C[API Gateway]
    C --> D[Microservices]
    D --> E[Drone Control]
    D --> F[Inventory DB]
    D --> G[Telemetry Stream]
```

---