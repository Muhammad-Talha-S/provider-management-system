# Provider Management System (PMS)

## Project Overview

The **Provider Management System** is a web-based portal developed as part of the academic project  
**Agile Development in Cloud Computing Environments (WS 2025/26)** at **Frankfurt University of Applied Sciences**.

The system represents the **provider-facing subsystem** of a distributed enterprise IT landscape where multiple student groups collaboratively developed interconnected systems:

- **Group 2 – Contract Management System**
- **Group 3 – Service Management System**
- **Group 4a – Provider Management System (this repository)**

The Provider Management System enables **external service providers** to securely interact with the FraUAS platform. Providers can manage their organization, internal users, contracts, service requests, offers, and service orders through a role-based portal.

**Live Deployment (Railway):**  
https://provider-management-system-production-c2de.up.railway.app/

---

## Academic Context

- **Course:** Agile Development in Cloud Computing Environments  
- **Module:** Optional Technical Subject (Module 11)  
- **Semester:** WS 2025/26  
- **Faculty:** Computer Science & Engineering  
- **University:** Frankfurt University of Applied Sciences  
- **Group:** 4a (Individual Implementation)  
- **Examiner:** Prof. Dr. Patrick Wacht  

---

## System Architecture

### Backend
- Django + Django REST Framework
- PostgreSQL
- JWT Authentication
- REST APIs for internal and external integration

### Frontend
- Vite + React + TypeScript
- Role-based routing and protected views
- Axios for API communication

### Deployment
- Railway (Backend, Frontend, PostgreSQL)

---

## Repository Structure

```
provider-management-system/
├── backend/          # Django backend
├── frontend/         # React frontend (Vite)
│   └── src/          # Pages, components, API clients
└── README.md
```

---

## User Roles

- **Provider Admin** – Provider profile, users, activity log
- **Supplier Representative** – Service requests, offers, service orders
- **Contract Coordinator** – Contracts, negotiation, signing
- **Specialist** – Assigned service orders

---

## Core Features

- JWT-based authentication
- Role-based access control
- Multi-provider data isolation
- Service Request → Offer → Service Order lifecycle
- Contract negotiation and signing
- Activity log (audit trail)
- REST-based integrations

---

## External Integrations

### Service Management (Group 3)
- Receives service requests
- Accepts provider offers
- Returns decisions and service orders

### Contract Management (Group 2)
- Sends contract drafts
- Receives counteroffers
- Confirms signed contracts

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm
- PostgreSQL
- Git

---

## Backend Setup (Local)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Linux / macOS
# .venv\Scripts\activate     # Windows

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend URL:
```
http://127.0.0.1:8000
```

---

## Frontend Setup (Local)

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:
```
http://127.0.0.1:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

```
DEBUG=True
SECRET_KEY=change-me
ALLOWED_HOSTS=127.0.0.1,localhost

DB_NAME=providers_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
```

### Frontend (`frontend/.env`)

```
VITE_API_BASE=http://127.0.0.1:8000
```

---

## Deployment (Railway)

- GitHub connected to Railway
- Automatic deployment on `main` branch
- Backend root: `backend/`
- Frontend root: `frontend/`
- PostgreSQL via Railway add-on

---

## Documentation & Evaluation

- Source code submission (ZIP)
- Full project report (PDF)
- Scrum process, architecture, integrations, and technology comparison

---

## License

Academic project – for educational purposes only.
