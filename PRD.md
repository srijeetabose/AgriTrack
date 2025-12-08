# AgriTrack: Smart India Hackathon 2025 - Official PRD

**Problem ID:** SIH25261  
**Category:** Software + Hardware (IoT)  
**Version:** 2.1 (Rapid Development - 72 Hour Sprint)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture (Microservices)](#2-system-architecture-microservices)
3. [Frontend Specifications](#3-frontend-specifications)
4. [Detailed Functional Requirements](#4-detailed-functional-requirements)
5. [Sprint Plan](#5-sprint-plan-team-of-6)
6. [Acceptance Criteria](#6-acceptance-criteria-for-judges)
7. [72-Hour Battle Plan](#7-72-hour-battle-plan)

---

## Development Constraints & Decisions

| Constraint | Decision |
|------------|----------|
| **Timeline** | 72 hours (2-3 days) |
| **Hardware** | Deferred - Full simulation mode first |
| **Mobile Platform** | Capacitor (Android only) |
| **Database** | Supabase Free Tier (50 concurrent connection limit) |
| **Deployment** | Railway.app (faster than manual VPS) |
| **SMS** | Mock initially → Twilio integration last |
| **Approach** | Simulation-first, monorepo structure |

---

## 1. Executive Summary

AgriTrack is a **containerized, cloud-agnostic platform** for monitoring Crop Residue Management (CRM) machinery. It fuses **Real-time IoT data** (from physical ESP32 devices) with **High-Volume Simulation data** to demonstrate scalability.

The system uses an **AI Engine** to analyze productivity/anomalies and delivers insights via:
- A **minimalist mobile app** for farmers
- A **complex admin dashboard** for officials

---

## 2. System Architecture (Microservices)

The entire stack is containerized (Docker) for deployment on Railway.app or any cloud platform.

### 2.0 Project Structure (Monorepo)

```
AgriTrack/
├── apps/
│   ├── web/                 # Next.js Admin Dashboard
│   ├── mobile/              # Capacitor + React (Android)
│   └── api/                 # Node.js Central Backend (Express)
├── services/
│   ├── ai-engine/           # Python ML Container
│   ├── mqtt-broker/         # Mosquitto Config
│   └── simulator/           # Python IoT Simulator (50 tractors)
├── packages/
│   └── shared/              # Shared types, constants
├── docker-compose.yml
├── .env.example
└── README.md
```

### 2.1 Data Sources (Hybrid Input)

#### Physical IoT Node (The "Real" Model)

| Component | Specification |
|-----------|---------------|
| **Hardware** | ESP32 + GSM Module (SIM900A/SIM800L) + Accelerometer (MPU6050) + GPS (NEO-6M) |
| **Protocol** | MQTT (Publishes to `agritrack/live/sensors`) |

**Payload Example:**
```json
{
  "id": "real_01",
  "temp": 45.2,
  "vib_x": 0.04,
  "gps": [28.7, 77.1],
  "timestamp": 17000...
}
```

#### Simulation Engine (The "Scale" Model)

| Aspect | Details |
|--------|---------|
| **Logic** | Python script generating 50-100 virtual machine streams |
| **Function** | Simulates diverse scenarios (Idle, Active, Overheating, Geofence Breach) to stress-test the backend |

### 2.2 Central Backend API (Node.js + Express)

> **NEW: Dedicated backend to connect all microservices**

| Function | Description |
|----------|-------------|
| **API Gateway** | REST endpoints for mobile/web apps (`/api/v1/*`) |
| **MQTT Bridge** | Listens to MQTT Broker, processes sensor data |
| **WebSocket Hub** | Socket.io server pushing real-time updates to frontends |
| **Service Orchestrator** | Calls AI Engine, manages machine state |
| **Notifications** | Twilio SMS integration (mock initially) |

**Key Endpoints:**
```
POST   /api/v1/auth/webhook     # Clerk webhook → Supabase sync
GET    /api/v1/machines         # List all machines
GET    /api/v1/machines/:id     # Single machine details
POST   /api/v1/bookings         # Farmer books a machine
GET    /api/v1/analytics        # AI-computed metrics
WS     /socket                  # Real-time machine updates
```

### 2.3 AI Engine (Python)

| Component | Description |
|-----------|-------------|
| **Interface** | Runs as a separate container; reads batch data from the Database |
| **Efficiency Metric** | `Efficiency = (Active Time / Total Engine On Time)` |
| **Productivity Metric** | `Productivity = (Acres Covered / Fuel Consumed)` - Estimated via GPS |
| **Anomaly Detection** | Uses **Isolation Forest** (Scikit-learn) to detect unusual vibration patterns (predicting breakdown) |

### 2.4 Authentication & Storage

| Component | Implementation |
|-----------|----------------|
| **Auth Flow** | Clerk (Frontend) → Webhooks → Supabase (Backend) |
| **Requirement** | User data must be natively synced to Supabase `users` table for relational integrity |
| **Database** | Supabase (PostgreSQL) for relational data + TimescaleDB (or standard Postgres) for Time-Series logs |

---

## 3. Frontend Specifications

### 3.1 Farmer Mobile App (Capacitor + React)

**Design Philosophy:** *"Clean & Functional."* Modern but simple, high contrast for field use, subtle polish.

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Capacitor + React + Vite (Android APK) |
| **UI Library** | Tailwind CSS + shadcn/ui (minimal components) |
| **Color Scheme** | Green/Earth tones, high contrast for sunlight visibility |
| **Big Button 1** | "Book Machine" - Large, rounded, with subtle shadow |
| **Big Button 2** | "My Status" (Active/Pending) - Status badge with color coding |
| **Visuals** | Clean cards, simple icons, readable typography |
| **Animations** | Minimal - only loading spinners and status transitions |
| **Offline** | LocalStorage caching for basic data |

### 3.2 Admin Dashboard (Web)

**Design Philosophy:** *"Professional & Data-Rich."* Clean dashboard aesthetic, good use of whitespace, intuitive navigation.

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Next.js 14 + Tailwind CSS + shadcn/ui |
| **Theme** | Light mode default, dark mode optional |
| **Layout** | Sidebar navigation + Main content area |
| **Components** | Cards, Tables, Modals, Toast notifications |
| **Map** | Leaflet with custom markers (color-coded by status) |
| **Charts** | Recharts - Line, Bar, Pie for analytics |
| **Features** | Real-time Map, AI Analytics Graphs, Simulation Control Panel, Alert Feed |

---

## 4. Detailed Functional Requirements

### 4.1 Hardware & IoT Implementation

| Requirement ID | Description |
|----------------|-------------|
| **REQ-IOT-01** | ESP32 must transmit data over GPRS (SIM900A) to handle "No Wi-Fi" field conditions |
| **REQ-IOT-02** | Device must buffer data locally (Edge Caching) if GSM signal is lost and retry upload later |

### 4.2 Backend & Communication

| Requirement ID | Description |
|----------------|-------------|
| **REQ-BACK-01** | Implement MQTT Broker (Mosquitto/HiveMQ) to receive both Real and Sim data |
| **REQ-BACK-02** | WebSockets: Backend must emit `device_update` events < 200ms latency to frontend |

### 4.3 SMS Integration (Twilio) - DEFERRED

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| **REQ-SMS-01** | Mock SMS via console.log initially | P0 (Now) |
| **REQ-SMS-02** | Integrate Twilio Free Tier | P1 (If time) |
| **REQ-SMS-03** | Send SMS to farmers when machine assigned | P1 (If time) |
| **REQ-SMS-04** | Send "Overheat Alert" SMS immediately | P1 (If time) |

### 4.4 AI & Analysis

| Requirement ID | Description |
|----------------|-------------|
| **REQ-AI-01** | **Idle Time Detection:** If `GPS_Speed < 1km/h` AND `Engine_Vibration > 0` for > 5 mins → Flag as "Idle/Wasting Fuel" |
| **REQ-AI-02** | **Anomaly Prediction:** Flag machines with vibration variance > 2 Standard Deviations from the norm |

### 4.5 Deployment (DevOps)

| Requirement ID | Description |
|----------------|-------------|
| **REQ-DEP-01** | Dockerize all services with `docker-compose.yml` |
| **REQ-DEP-02** | Deploy to **Railway.app** (recommended for speed) or Render |
| **REQ-DEP-03** | Environment variables managed via Railway dashboard |
| **REQ-DEP-04** | Android APK generated via Capacitor CLI |

---

## 5. Sprint Plan (Team of 6) - 72 Hour Allocation

### Squad A: Full Stack & DevOps (Members 1 & 2)

| Task | Hours | Priority |
|------|-------|----------|
| Set up monorepo structure + Docker Compose | 2h | P0 |
| Deploy MQTT broker (Mosquitto) on Railway | 1h | P0 |
| Implement Clerk → Supabase Webhook | 2h | P0 |
| Build Next.js Dashboard shell | 4h | P0 |
| Integrate Leaflet map + real-time markers | 4h | P0 |
| Railway deployment + CI/CD | 3h | P0 |

### Squad B: Backend & AI (Members 3 & 4)

| Task | Hours | Priority |
|------|-------|----------|
| Node.js Express API boilerplate | 2h | P0 |
| MQTT → WebSocket bridge | 3h | P0 |
| Supabase schema + queries | 2h | P0 |
| Python AI container (Isolation Forest) | 4h | P0 |
| Idle detection + anomaly flagging | 3h | P0 |
| Mock SMS service (console logs) | 1h | P0 |
| Twilio integration | 2h | P1 |

### Squad C: Mobile & Simulation (Members 5 & 6)

| Task | Hours | Priority |
|------|-------|----------|
| Python simulator (50 virtual tractors) | 4h | P0 |
| Capacitor project setup | 2h | P0 |
| Farmer app UI (2 big buttons) | 3h | P0 |
| Booking flow + status display | 3h | P0 |
| Offline caching (LocalStorage) | 2h | P0 |
| Build Android APK | 2h | P0 |

---

## 6. Acceptance Criteria (For Judges)

| Criteria | Description |
|----------|-------------|
| **Hybrid Demo** | Show one physical device moving AND 50 virtual dots on the map simultaneously |
| **Real-Time Alert** | Heat up the sensor (or trigger sim) → Dashboard turns Red → SMS is received on phone within 5 seconds |
| **Offline Support** | Disconnect Internet on Phone → App still shows basic cached data |
| **Anomaly Detection** | AI correctly flags a "wobbly" machine from the simulation data |

---

## Appendix

### Reference Video Context

The selected deployment video demonstrates exactly how to deploy a Dockerized Next.js and Node.js application to a custom VPS, which is the precise deployment strategy required to ship the whole project in containers and deploy it to a custom server.

---

*Document Version: 2.1 | Last Updated: December 2025*

---

## 7. 72-Hour Battle Plan

### Day 1 (Hours 0-24): Foundation & Core

#### Morning (0-8h) - ALL SQUADS PARALLEL

| Squad | Tasks |
|-------|-------|
| **Squad A** | Monorepo setup, Docker Compose, Railway account, Supabase project |
| **Squad B** | Express API boilerplate, Supabase schema (machines, bookings, users, sensor_logs) |
| **Squad C** | Capacitor project init, Python simulator skeleton |

#### Afternoon/Evening (8-16h)

| Squad | Tasks |
|-------|-------|
| **Squad A** | Clerk setup, webhook endpoint, Next.js dashboard shell |
| **Squad B** | MQTT broker running, MQTT→WebSocket bridge working |
| **Squad C** | Simulator generating 50 tractors with GPS/temp/vibration, mobile UI layout |

#### Night (16-24h)

| Squad | Tasks |
|-------|-------|
| **Squad A** | Leaflet map rendering, markers from WebSocket |
| **Squad B** | Real-time machine state updates flowing |
| **Squad C** | Simulator publishing to MQTT, basic booking UI |

**Day 1 Checkpoint:** 50 dots moving on dashboard map ✓

---

### Day 2 (Hours 24-48): Features & Integration

#### Morning (24-32h)

| Squad | Tasks |
|-------|-------|
| **Squad A** | Dashboard alerts panel (red for overheat), charts setup |
| **Squad B** | AI container running Isolation Forest, anomaly detection |
| **Squad C** | Booking flow complete, "My Status" working |

#### Afternoon/Evening (32-40h)

| Squad | Tasks |
|-------|-------|
| **Squad A** | Simulation control panel (start/stop/inject faults) |
| **Squad B** | Idle detection logic, efficiency metrics API |
| **Squad C** | Offline caching, Android build test |

#### Night (40-48h)

| Squad | Tasks |
|-------|-------|
| **Squad A** | Railway deployment - all services live |
| **Squad B** | Mock SMS logging, analytics endpoint |
| **Squad C** | APK generation, install on test device |

**Day 2 Checkpoint:** Full flow working - Simulator → Backend → Dashboard + Mobile ✓

---

### Day 3 (Hours 48-72): Polish & Demo Prep

#### Morning (48-56h)

| Squad | Tasks |
|-------|-------|
| **Squad A** | UI polish, loading states, error handling |
| **Squad B** | Twilio setup (if time), edge cases |
| **Squad C** | Mobile UI polish, sunlight visibility testing |

#### Afternoon (56-64h)

| Squad | Tasks |
|-------|-------|
| **ALL** | End-to-end testing, bug fixes |
| **ALL** | Demo script preparation |

#### Evening (64-72h)

| Squad | Tasks |
|-------|-------|
| **ALL** | Final deployment verification |
| **ALL** | Demo rehearsal, backup plans |

**Day 3 Checkpoint:** Demo-ready with all acceptance criteria passing ✓

---

## 8. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Mobile App** | Capacitor + React + Vite + Tailwind + shadcn/ui |
| **Admin Dashboard** | Next.js 14 + Tailwind + shadcn/ui + Leaflet + Recharts |
| **Central API** | Node.js + Express + Socket.io |
| **AI Engine** | Python + FastAPI + Scikit-learn |
| **Crop Residue Service** | Python + FastAPI + Pandas + NumPy |
| **Simulator** | Python + paho-mqtt |
| **MQTT Broker** | Eclipse Mosquitto |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Clerk |
| **Containerization** | Docker + Docker Compose |
| **Deployment** | Railway.app / Any Cloud Platform |
| **SMS** | Twilio (if time permits) |

---

## 9. Implementation Status (Updated December 2025)

### ✅ Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Monorepo Structure** | ✅ Done | apps/, services/, packages/ |
| **Docker Compose** | ✅ Done | 6 services orchestrated |
| **MQTT Broker** | ✅ Done | Mosquitto on port 1883/9001 |
| **Central API** | ✅ Done | Express + Socket.io on port 3001 |
| **IoT Simulator** | ✅ Done | 50 virtual tractors |
| **Real-time Dashboard** | ✅ Done | Leaflet map + live markers |
| **Machine List Page** | ✅ Done | Search, filter, real-time status |
| **Machine Detail Page** | ✅ Done | Individual stats, charts, alerts |
| **AI Analytics Page** | ✅ Done | Efficiency metrics, anomaly detection |
| **Live Reports Page** | ✅ Done | Real-time stats, JSON export |
| **Crop Residue Service** | ✅ Done | NDVI predictions, allocations |
| **Crop Residue Dashboard** | ✅ Done | Priority table, allocation table |
| **Mobile App** | ✅ Done | Capacitor Android APK (5.1MB) |
| **AI Engine** | ✅ Done | FastAPI + Isolation Forest |

### 🔄 In Progress / Planned

| Feature | Priority | Notes |
|---------|----------|-------|
| **Twilio SMS Integration** | P1 | Mock SMS working, Twilio pending |
| **Railway Deployment** | P1 | Local Docker working, cloud pending |
| **Clerk Authentication** | P1 | Setup pending full integration |
| **Offline Mobile Caching** | P2 | LocalStorage partially implemented |
| **Physical ESP32 Device** | P2 | Simulation-first approach |

---

## 10. Critical Dependencies (Order Matters)

```
1. Supabase Project + Schema
   ↓
2. MQTT Broker Running
   ↓
3. Express API + WebSocket Server
   ↓
4. Simulator Publishing Data
   ↓
5. Dashboard Consuming WebSocket
   ↓
6. AI Engine Analyzing Data
   ↓
7. Mobile App Booking Flow
   ↓
8. Alerts + SMS
```

---

## 11. Environment Variables Template

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Clerk
CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_TOPIC=agritrack/live/sensors

# Twilio (optional)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# API URLs
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:8000
NEXT_PUBLIC_CROP_RESIDUE_URL=http://localhost:8001

# Simulator
NUM_MACHINES=50
PUBLISH_INTERVAL=2.0
```

---

## 12. Future Implementation Plans

### Phase 1: Production Readiness (Priority)

| Task | Description | Effort |
|------|-------------|--------|
| **Railway/Cloud Deployment** | Deploy all 6 containers to Railway.app | 2-3h |
| **Clerk Auth Integration** | Complete user authentication flow | 2h |
| **Supabase Data Persistence** | Store sensor logs, bookings in database | 3h |
| **SSL/HTTPS Setup** | Secure all endpoints | 1h |

### Phase 2: Enhanced Features

| Task | Description | Effort |
|------|-------------|--------|
| **Twilio SMS Alerts** | Real SMS for overheat/anomaly alerts | 2h |
| **Push Notifications** | Mobile app push notifications | 3h |
| **Geofencing Alerts** | Alert when machine leaves designated area | 4h |
| **Fuel Consumption Tracking** | Estimate fuel usage from sensor data | 4h |
| **Maintenance Scheduling** | Predictive maintenance based on anomalies | 6h |

### Phase 3: Advanced Analytics

| Task | Description | Effort |
|------|-------------|--------|
| **Historical Trend Analysis** | TimescaleDB integration for time-series | 6h |
| **Fleet Performance Reports** | Weekly/monthly PDF reports | 4h |
| **Comparative Analytics** | Machine-vs-machine efficiency comparison | 4h |
| **Weather Integration** | Correlate performance with weather data | 4h |
| **Satellite NDVI Integration** | Real satellite data instead of simulation | 8h |

### Phase 4: Hardware Integration

| Task | Description | Effort |
|------|-------------|--------|
| **ESP32 Firmware** | Complete IoT device firmware | 8h |
| **OTA Updates** | Over-the-air firmware updates | 4h |
| **Multi-Sensor Support** | Additional sensors (humidity, soil, etc.) | 6h |
| **Edge Computing** | On-device anomaly detection | 6h |

### Phase 5: Scale & Enterprise

| Task | Description | Effort |
|------|-------------|--------|
| **Multi-Tenant Support** | Multiple organizations, regions | 8h |
| **Role-Based Access Control** | Admin, Operator, Farmer roles | 4h |
| **Audit Logging** | Complete activity tracking | 4h |
| **API Rate Limiting** | Production-grade API security | 2h |
| **Load Balancing** | Kubernetes/Docker Swarm setup | 8h |

---

*Document Version: 2.2 | Last Updated: December 5, 2025*
