# Cella & Cona App

Frontend (Vite + React) and backend (FastAPI + SQLite) for the Cella & Cona
food delivery experience.

## Frontend
### Prerequisites
- Node.js 18+

### Env vars
- `VITE_API_URL=http://127.0.0.1:8000`
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`

### Run locally
```
cd D:\Code\GitHub\BELLABONA
npm install
npm run dev
```
Open `http://localhost:5173`.

## Backend
### Prerequisites
- Python 3.10+

### Run locally
```
cd D:\Code\GitHub\BELLABONA\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
Open `http://127.0.0.1:8000/docs` for API docs.

## API Overview
- `GET /dishes` list dishes
- `POST /dishes` create dish (optional details)
- `GET /orders` list orders
- `POST /orders` create order

## Project Structure
- `src/` frontend UI
- `backend/app/` FastAPI app
