# Quick Start Guide

## Prerequisites
1. **Node.js** (v16 or higher) - Download from nodejs.org
2. **MongoDB** - Choose one option:
   - **Option A**: Install MongoDB locally from mongodb.com
   - **Option B**: Use MongoDB Atlas (cloud) - Create free account at mongodb.com/atlas

## Setup Instructions

### 1. Start MongoDB (if using local installation)
- On Windows: Run `mongod` in command prompt or start MongoDB service
- On Mac: Run `brew services start mongodb-community` or `mongod`
- On Linux: Run `sudo systemctl start mongod`

### 2. Install Dependencies
```bash
# In the main project directory
npm install

# In the server directory
cd server
npm install
```

### 3. Configure Environment
The server/.env file is already created with default settings:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/surveyjs
CLIENT_URL=http://localhost:5173
```

**For MongoDB Atlas**: Update MONGODB_URI with your Atlas connection string

### 4. Start the Servers

#### Option A: Start Both Servers Together
```bash
# From the main project directory
npm run dev:all
```

#### Option B: Start Servers Separately

**Backend Server (Terminal 1):**
```bash
cd server
npm run dev
```

**Frontend Server (Terminal 2):**
```bash
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## VS Code Tasks
You can also use VS Code tasks:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select one of:
   - "Start Frontend Development Server"
   - "Start Backend Development Server" 
   - "Start All Servers"

## Troubleshooting

### Backend won't start
1. **Check MongoDB**: Ensure MongoDB is running
2. **Check port**: Make sure port 5000 is not in use
3. **Check dependencies**: Run `npm install` in server directory

### Frontend won't start
1. **Check dependencies**: Run `npm install` in main directory
2. **Check port**: Make sure port 5173 is not in use

### Connection issues
1. **Check CORS**: Ensure CLIENT_URL in server/.env matches frontend URL
2. **Check firewall**: Ensure ports 5000 and 5173 are not blocked

## Manual Commands

If npm scripts don't work, use these direct commands:

**Backend:**
```bash
cd server
node server.js
```

**Frontend:**
```bash
npx vite
```

## Features Available

Once both servers are running:
1. **Create surveys** at `/create`
2. **View dashboard** at `/dashboard`
3. **Share survey links** like `/survey/{id}`
4. **View results** at `/results/{id}`
5. **Export to Excel** from the results page
