# AgriTrack - Smart CRM Machinery Monitoring

🚜 **Smart India Hackathon 2025** | Problem ID: SIH25261

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/)
- [Supabase Account](https://supabase.com/)
- [Clerk Account](https://clerk.com/)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/KD-3030/AgriTrack.git
cd AgriTrack
cp .env.example .env
# Edit .env with your Supabase and Clerk credentials
```

### 2. Setup Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to SQL Editor
4. Copy contents of `database/schema.sql` and run it

### 3. Run with Docker

```bash
# Start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Admin Dashboard | http://localhost:3000 | Next.js web dashboard |
| API Server | http://localhost:3001 | Express + Socket.io backend |
| AI Engine | http://localhost:8000/docs | FastAPI ML service |
| Crop Residue API | http://localhost:8001/docs | NDVI prediction & allocation |
| MQTT Broker | mqtt://localhost:1883 | Mosquitto broker |
| MQTT WebSocket | ws://localhost:9001 | WebSocket for MQTT |

## Project Structure

```
AgriTrack/
├── apps/
│   ├── web/                 # Next.js Admin Dashboard
│   │   └── src/
│   │       ├── app/
│   │       │   ├── dashboard/       # Main dashboard pages
│   │       │   │   ├── machines/    # Machine list & details
│   │       │   │   ├── analytics/   # AI analytics page
│   │       │   │   └── reports/     # Live usage reports
│   │       │   └── crop-residue/    # NDVI-based management
│   │       ├── components/          # Reusable UI components
│   │       └── lib/                 # API clients & utilities
│   ├── mobile/              # Capacitor Mobile App (Android APK)
│   └── api/                 # Node.js Central Backend
├── services/
│   ├── ai-engine/           # Python ML (FastAPI) - Port 8000
│   ├── crop-residue/        # NDVI Prediction (FastAPI) - Port 8001
│   ├── mqtt-broker/         # Mosquitto Config
│   └── simulator/           # IoT Simulator (50 tractors)
├── database/
│   └── schema.sql           # Supabase schema
├── docker-compose.yml       # All 6 services orchestrated
├── .env.example
└── PRD.md                   # Product Requirements
```

## Services Overview

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **web** | 3000 | Next.js 14 | Admin dashboard with real-time maps, charts |
| **api** | 3001 | Express + Socket.io | Central API, MQTT bridge, WebSocket hub |
| **ai-engine** | 8000 | FastAPI + Scikit-learn | Anomaly detection, efficiency metrics |
| **crop-residue** | 8001 | FastAPI + Pandas | NDVI predictions, machine allocation |
| **mqtt-broker** | 1883/9001 | Mosquitto | IoT message broker |
| **simulator** | - | Python | Generates 50 virtual tractors |

## Dashboard Features

### 🗺️ Real-Time Map
- Live machine positions on interactive Leaflet map
- Color-coded markers (Active/Idle/Maintenance/Alert)
- Click markers for machine details

### 🚜 Individual Machine Stats
- Real-time temperature, speed, vibration monitoring
- Historical charts with 30-point rolling data
- Alert history and maintenance status

### 📊 AI Analytics
- Machine efficiency scoring
- Anomaly detection with Isolation Forest ML
- Train custom models on your data

### 📋 Live Usage Reports
- Real-time fleet statistics
- Export reports as JSON
- Automatic snapshots every 5 seconds

### 🌾 Crop Residue Management
- NDVI-based harvest predictions for Punjab, Haryana, Delhi-NCR
- Optimized machine allocation using greedy algorithm
- Priority scoring for urgent districts
- Interactive NDVI history charts

## Development (Without Docker)

### Run API
```bash
cd apps/api
npm install
npm run dev
```

### Run Web Dashboard
```bash
cd apps/web
npm install
npm run dev
```

### Run Simulator
```bash
cd services/simulator
pip install -r requirements.txt
python simulator.py
```

### Run AI Engine
```bash
cd services/ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Run Crop Residue Service
```bash
cd services/crop-residue
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

## API Endpoints

### Central API (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/machines` | List all machines |
| GET | `/api/v1/machines/:id` | Get machine details |
| GET | `/api/v1/machines/realtime/all` | Get all real-time states |
| POST | `/api/v1/bookings` | Create booking |
| GET | `/api/v1/bookings/farmer/:id` | Get farmer's bookings |
| GET | `/api/v1/analytics` | Dashboard stats |
| POST | `/api/v1/auth/webhook` | Clerk webhook |

### AI Engine (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Get all machine statistics |
| GET | `/efficiency` | Efficiency metrics |
| GET | `/anomalies` | Detected anomalies |
| POST | `/train` | Train ML model |

### Phase 2: Notifications API (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications/preferences/:userId` | Get user notification preferences |
| POST | `/api/v1/notifications/preferences` | Save notification preferences |
| POST | `/api/v1/notifications/push-token` | Register push notification token |
| POST | `/api/v1/notifications/send` | Send notification (admin) |

### Phase 2: Geofencing API (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geofences` | List all geofences |
| GET | `/api/v1/geofences/:id` | Get geofence with machines |
| POST | `/api/v1/geofences` | Create geofence |
| PUT | `/api/v1/geofences/:id` | Update geofence |
| DELETE | `/api/v1/geofences/:id` | Delete geofence |
| POST | `/api/v1/geofences/:id/machines` | Assign machines |
| GET | `/api/v1/geofences/:id/breaches` | Get breach history |

### Phase 2: Fuel Tracking API (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/fuel/:machineId` | Get fuel stats |
| GET | `/api/v1/fuel/:machineId/history` | Get fuel history |
| GET | `/api/v1/fuel/:machineId/refueling` | Get refueling events |
| POST | `/api/v1/fuel/:machineId/refueling` | Record refueling |
| GET | `/api/v1/fuel/fleet/summary` | Fleet fuel summary |

### Phase 2: Maintenance API (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/types` | Get maintenance types |
| GET | `/api/v1/maintenance/summary` | Fleet maintenance summary |
| GET | `/api/v1/maintenance/upcoming` | Upcoming maintenance |
| GET | `/api/v1/maintenance/overdue` | Overdue maintenance |
| GET | `/api/v1/maintenance/machine/:id` | Machine schedules |
| POST | `/api/v1/maintenance` | Create schedule |
| POST | `/api/v1/maintenance/:id/complete` | Complete maintenance |

### Crop Residue API (Port 8001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Complete dashboard data |
| GET | `/api/predictions` | Harvest predictions |
| GET | `/api/allocations` | Machine allocations |
| GET | `/api/urgent` | Urgent districts (priority ≥7) |
| GET | `/api/ndvi-history/{district_id}` | NDVI history for district |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `device_update` | Server → Client | Real-time machine state |
| `booking_update` | Server → Client | Booking status change |
| `initial_state` | Server → Client | All machines on connect |

## Phase 2: Enhanced Features

### 📱 Twilio SMS Alerts
- Real-time SMS notifications for critical alerts (overheat, high vibration)
- Configurable per-user notification preferences
- Alert cooldown to prevent spam (5 min default)
- Bulk SMS capability for fleet-wide notifications

### 🔔 Push Notifications (Firebase)
- Native push notifications via Firebase Cloud Messaging
- Support for iOS, Android, and Web platforms
- User device token management
- Rich notification payloads with deep linking

### 🗺️ Geofencing
- Define operational boundaries (circle or polygon)
- Real-time breach detection when machines exit zones
- Automatic alerts on geofence violations
- Assign multiple machines to geofences
- Breach history logging and reporting

### ⛽ Fuel Consumption Tracking
- Real-time fuel level monitoring
- Consumption rate calculations
- Low fuel alerts (<20%)
- Theft detection (sudden drops >20%)
- Refueling event logging
- Fuel efficiency analytics
- Range estimation

### 🔧 Maintenance Scheduling
- Create maintenance schedules (by date, mileage, or hours)
- Multiple maintenance types (oil change, filter, service, etc.)
- Automatic reminders (7, 3, 1 day before due)
- Recurring maintenance support
- Complete maintenance history
- Fleet-wide maintenance dashboard
- Overdue maintenance alerts

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui, Leaflet, Recharts
- **Mobile**: Capacitor + React + Vite (Android APK)
- **Backend**: Node.js, Express, Socket.io
- **AI/ML**: Python, FastAPI, Scikit-learn (Isolation Forest)
- **Crop Analysis**: Python, FastAPI, Pandas, NumPy
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **Notifications**: Twilio (SMS), Firebase Admin (Push)
- **MQTT**: Eclipse Mosquitto
- **Containerization**: Docker, Docker Compose
- **Deployment**: Railway.app / Any cloud platform

## Environment Variables

See `.env.example` for all required variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:8000
NEXT_PUBLIC_CROP_RESIDUE_URL=http://localhost:8001

# Simulator
NUM_MACHINES=50
PUBLISH_INTERVAL=2.0
```

## Team

| Squad | Members | Responsibilities |
|-------|---------|-----------------|
| A | 1, 2 | DevOps, Dashboard, Auth |
| B | 3, 4 | Backend, AI, SMS |
| C | 5, 6 | Mobile App, Simulator |

---

Made with ❤️ for Smart India Hackathon 2025


