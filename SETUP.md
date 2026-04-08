# CareBridge - Complete Setup Guide

## Project Overview
CareBridge is a health prediction system with:
- **Frontend**: React + TypeScript + Tailwind CSS (Port 3000)
- **Backend**: Spring Boot Java (Port 8081)
- **ML Service**: FastAPI Python (Port 8001)

## System Architecture
1. User registers/logs in
2. Patient takes health assessment (5 steps):
   - Step 1: Enter age, weight, height, BMI
   - Steps 2-4: Select symptoms (132 total, split across 3 pages)
   - Step 5: Review and submit
3. ML model receives symptoms as 1/0 (selected/not selected)
4. Model predicts disease
5. Backend fetches matching therapist and hospital
6. Results displayed to user

## Prerequisites
- Node.js v18+
- Java 17+
- Python 3.9+
- PostgreSQL database

## Database Setup
```bash
# Create PostgreSQL database
createdb carebridge_db
```

The connection is pre-configured in `application.properties`.

## Quick Start (Recommended)

### Option 1: Batch Script (Windows)
Simply double-click `START.bat` from the project root folder. This will automatically start all three services in separate windows.

### Option 2: Manual Start (3 separate terminals)

**Terminal 1 - ML Service (Port 8001):**
```bash
cd ml-service
python main.py
```

**Terminal 2 - Backend (Port 8081):**
```bash
cd carebridge-backend
.\mvnw spring-boot:run
```

**Terminal 3 - Frontend (Port 3000):**
```bash
cd carebridge-frontend
npm install  # Only first time
npm run dev
```

## Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8081
- **ML Service**: http://localhost:8001

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Prediction
- `POST /api/prediction/analyze` - Send symptoms for analysis
  - Input: `{ symptoms: string[], weight: number, height: number, bmi: number }`
  - Output: `{ disease: string, therapistName: string, hospitalSuggestion: string }`

### ML Service
- `GET /assets/symptoms` - Get all 132 symptoms
- `GET /assets/diseases` - Get all 41 diseases
- `POST /predict` - Direct ML prediction

## Port Configuration
All ports are pre-configured and shouldn't conflict:
- Frontend: **3000**
- Backend: **8081** 
- ML Service: **8001**

If any port is in use, update:
- Frontend: `carebridge-frontend/vite.config.js` (server.port)
- Backend: `carebridge-backend/src/main/resources/application.properties` (server.port)
- ML Service: `ml-service/main.py` (port parameter)

## User Roles
1. **Patient**: Takes assessments, views results
2. **Therapist**: Registers with specialization
3. **Hospital**: Registers with specialization

## Testing the Flow
1. Open http://localhost:3000 in browser
2. Register as patient (click "Register here")
3. Login with your credentials
4. Click "Start Assessment"
5. Complete 5-step form
6. Submit and view results

## Troubleshooting

### Port Already in Use
If you see "Port 8080/8081/8001 already in use":
```powershell
# Find process using port (Windows PowerShell)
Get-NetTCPConnection -LocalPort 8081 | Select-Object -Property ProcessName

# Kill the process
Stop-Process -Id <PID> -Force
```

### Frontend Dependencies Issue
```bash
cd carebridge-frontend
npm install
npm run dev
```

### Database Connection Error
Ensure PostgreSQL is running and database `carebridge_db` exists with correct credentials in `application.properties`.

### ML Service Not Responding
Check that `/ml-service` directory exists and `main.py` has the model file (`model.pkl`).

## Project Structure
```
care-bridge/
├── carebridge-backend/       # Spring Boot Java backend
├── carebridge-frontend/      # React + Vite frontend
├── ml-service/               # FastAPI ML service
├── START.bat                 # Quick start script (Windows)
└── SETUP.md                  # This file
```
