# Tuniverse 🌌🎶

Tuniverse is a full-stack music analytics and visualization application that transforms Spotify listening data into an interactive, space-themed experience. Inspired by Spotify Wrapped, Tuniverse allows users to explore their listening habits, moods, and trends at any point in time — not just once a year.

## Current Status
🚧 In active development

## Features (In Progress)
- Spotify OAuth authentication
- Backend API built with FastAPI
- Secure environment-based configuration
- Health check endpoint
- Spotify OAuth login and authorization flow
- OAuth token exchange with Spotify (access + refresh tokens)


## Tech Stack
**Backend**
- Python 3
- FastAPI
- Uvicorn
- Spotify Web API

**Frontend (Planned)**
- React
- TypeScript
- Data visualization (TBD)

## Architecture (Early Stage)
- FastAPI backend serving REST endpoints
- Modular router structure
- Spotify OAuth for user authentication
- Environment variables for secret management
- OAuth-based authentication with Spotify Accounts service
- Secure token exchange using Spotify Accounts service

Typed API Responses (Pydantic Models)
- Backend responses are defined using Pydantic models
- Enables automatic OpenAPI schema generation
- Improves frontend-backend contracts
- Lays groundwork for ML-ready data pipelines

Response Models
- API responses are enforced using Pydantic models
- Ensures consistent backend → frontend contracts
- Enables automatic OpenAPI documentation
- Prepares data layer for future ML integration


## Data Modeling & API Contracts
The backend uses explicit response models to define and guarantee the shape of data returned by API endpoints.

These models:
- Serve as a stable contract between backend and frontend
- Enable automatic FastAPI documentation and validation
- Make the system easier to evolve (including future ML-based analysis)
- Reduce frontend guesswork and defensive coding

Response models live in the `backend/models` directory and are introduced incrementally as endpoints stabilize.

API Design Decisions
- Responses are normalized for frontend consumption
- Arrays of objects are preferred over tuples
- Pydantic models enforce stable response contracts
- Backend minimizes transformation logic required by frontend



## Setup & Installation

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Roadmap
Phase 1 – Core Experience
- Complete backend API and data models
- Build interactive, space-themed frontend
- Deploy and launch Tuniverse

Phase 2 – Intelligence Layer (Stretch Goal)
- Introduce machine learning for mood detection and pattern analysis
- Replace or augment rule-based transformers with learned models
- Preserve existing API contracts while enhancing insights

Spotify Audio Features endpoints are deprecated for new apps (403). Tuniverse uses track metadata + genres instead.
