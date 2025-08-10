# SurveyJS App — What it does and how to run it

This project is a full-stack survey platform built with React (Vite) and SurveyJS on the frontend, and Node.js/Express with MongoDB on the backend.

## What you can do

- Design surveys in the browser with SurveyJS Creator (drag-and-drop, many question types)
- Share surveys via links and collect responses with the Survey Runner
- Persist surveys and responses in MongoDB
- Upload files (handled by the backend)
- View results and analytics; export responses to Excel (XLSX)
- Manage everything from a dashboard (create, view, and control surveys)

## Tech overview

- Frontend: React 19 + Vite, SurveyJS (creator/react-ui), React Router, Axios
- Backend: Express, Mongoose (MongoDB), Multer, Helmet, Rate limiting
- Default ports: Frontend http://localhost:5173, Backend http://localhost:5000
- API base URL: http://localhost:5000/api

## Prerequisites

- Node.js 18+ (recommended)
- MongoDB (Local or Atlas URI)

## Quick start (Windows, cmd)

From the project root:

```cmd
:: 1) Install root and server dependencies
npm run setup

:: 2) Start backend and frontend together
npm run dev:all
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health

If you prefer running in separate terminals:

```cmd
:: Terminal 1 (backend)
npm run server:dev

:: Terminal 2 (frontend)
npm run dev
```

Alternatively, you can start the backend using the batch file:

```cmd
server\start-server.bat
```

## Configuration (optional)

Create a `server/.env` file to override defaults:

```
MONGODB_URI=mongodb://localhost:27017/surveyjs
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

If `MONGODB_URI` is not set, the backend will attempt to use `mongodb://localhost:27017/surveyjs`.

## Useful scripts

```cmd
:: Root scripts
npm run setup        :: install deps in root and /server
npm run dev          :: start frontend (Vite)
npm run dev:all      :: start backend (nodemon) and frontend concurrently
npm run build        :: build frontend
npm run preview      :: preview built frontend

:: Backend scripts (run from project root)
npm run server:dev   :: start backend with nodemon
npm run server:install :: install backend dependencies
```

## Notes

- Ensure MongoDB is running locally or provide a valid Atlas connection string in `server/.env`.
- CORS is enabled; adjust `CLIENT_URL` and CORS settings in `server/server.js` for production.
- For production, build the frontend with `npm run build` and deploy the backend separately with proper environment variables.
