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


## Setup & Installation

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload