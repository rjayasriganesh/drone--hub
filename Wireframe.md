# ShadowFly System URL Workflow

## 1. Authentication Flow
```
/login → /index
```
- User/Admin authentication

- Role verification

- Session creation

## 2. Home Navigation
```
/index → {/drone, /tower, /admin-dashboard}
```

- 3D globe interface

- Navigation options:

  - For Users: Drone & Tower access
  
  - For Admins: Additional Dashboard access
  
- Logout option

## 3. Admin Management Flow
```
/admin-dashboard
├─→ /ddt-info
└─→ /rack
```
### Features at /admin-dashboard:

- Map visualization

- Warehouse management

- DDT management

- CSV data import

- Search functionality

## 4. Drone Operations Flow
```
/drone
├─→ /warehouse-selection
│   └─→ /drone-assignment
│       └─→ /delivery-duties
│           └─→ /tower
└─→ /package-system
```

### Step-by-Step Process:

1. `/warehouse-selection`: Choose operating warehouse

2. `/drone-assignment`: Assign available drones

3. `/delivery-duties`: Plan delivery routes

4. `/package-system`: Configure package details

5. `/tower`: Monitor mission execution

## 5. Mission Control Flow
```
/tower
```

### Features:

- Live drone tracking

- Weather monitoring

- Route visualization

- Mission status updates

## Complete URL Navigation Flow:
```
/login
   │
   v
/index
   │
   ├────────────────────┬─────────────────┐
   v                    v                 v
/admin-dashboard     /drone             /tower
   │                    │
   ├─→ /ddt-info       ├─→ /warehouse-selection
   │                    │       │
   └─→ /rack           │       v
                       │    /drone-assignment
                       │       │
                       │       v
                       │    /delivery-duties
                       │       │
                       │       v
                       └─→ /package-system
                               │
                               v
                            /tower
```

### User Journey Paths:

1. **Admin Journey**:
```
/login → /index → /admin-dashboard
                     ↓
            [Manage DDTs & Warehouses]
                     ↓
              /ddt-info or /rack
```

2. **Operator Journey**:
```
/login → /index → /drone → /warehouse-selection
                             ↓
                     /drone-assignment
                             ↓
                     /delivery-duties
                             ↓
                     /package-system
                             ↓
                          /tower
```

3. **Mission Monitoring**:
```
/login → /index → /tower
```

