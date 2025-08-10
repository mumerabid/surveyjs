# SurveyJS Platform

A comprehensive React-based survey platform using SurveyJS that allows users to design surveys, share them via links, collect responses, and export results to Excel.

## 🚀 Features

- **Survey Creation**: Drag-and-drop survey builder with rich question types
- **Link Sharing**: Share surveys via direct links
- **Response Collection**: Collect and store responses in MongoDB
- **Real-time Results**: View survey results and analytics
- **Excel Export**: Export responses to Excel files for analysis
- **Dashboard**: Manage all surveys from a central dashboard

## 🛠️ Tech Stack

### Frontend
- React 19.1.1
- SurveyJS (Creator & Runner)
- React Router for navigation
- Axios for API calls
- Vite for development

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Excel export with SheetJS (xlsx)
- CORS, Helmet for security

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

## 🔧 Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd surveyjs
```

### 2. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Start the development server
npm run dev
```
The frontend will be available at `http://localhost:5173`

### 3. Backend Setup
```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Copy environment file and configure
cp .env.example .env

# Start the backend server
npm run dev
```
The backend will be available at `http://localhost:5000`

### 4. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. The app will connect to `mongodb://localhost:27017/surveyjs`

#### Option B: MongoDB Atlas
1. Create a MongoDB Atlas account
2. Create a cluster and get the connection string
3. Update `MONGODB_URI` in `server/.env` with your Atlas connection string

## 🚀 Usage

### Creating a Survey
1. Go to the homepage
2. Click "Create Survey" or navigate to `/create`
3. Use the SurveyJS Creator to design your survey
4. Save the survey

### Sharing a Survey
1. Go to the Dashboard (`/dashboard`)
2. Find your survey and copy the survey link
3. Share the link with respondents

### Viewing Results
1. From the Dashboard, click "View Results" on any survey
2. See response statistics and individual responses
3. Export to Excel for detailed analysis

### Managing Surveys
- **Activate/Deactivate**: Control whether a survey accepts new responses
- **Delete**: Remove surveys and all associated responses
- **Edit**: Modify survey settings (title, description, active status)

## 📁 Project Structure

```
surveyjs/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   │   └── Header.jsx
│   ├── pages/          # Page components
│   │   ├── Home.jsx
│   │   ├── SurveyCreator.jsx
│   │   ├── SurveyRunner.jsx
│   │   ├── Dashboard.jsx
│   │   └── SurveyResults.jsx
│   ├── services/       # API services
│   │   └── surveyService.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── server/             # Backend server
│   ├── models/         # MongoDB models
│   │   └── Survey.js
│   ├── routes/         # API routes
│   │   └── surveys.js
│   ├── server.js       # Main server file
│   ├── package.json
│   └── .env
├── package.json
└── README.md
```

## 🔗 API Endpoints

### Surveys
- `GET /api/surveys` - Get all surveys
- `POST /api/surveys` - Create a new survey
- `GET /api/surveys/:id` - Get a specific survey
- `PUT /api/surveys/:id` - Update a survey
- `DELETE /api/surveys/:id` - Delete a survey

### Responses
- `POST /api/surveys/:id/responses` - Submit a response
- `GET /api/surveys/:id/responses` - Get all responses for a survey
- `GET /api/surveys/:id/export` - Export responses to Excel

### Health Check
- `GET /api/health` - Server health status

## 🎨 Customization

### Themes
SurveyJS supports various themes. You can customize the appearance by modifying the CSS imports in the survey components.

### Question Types
The platform supports all SurveyJS question types:
- Text inputs
- Multiple choice
- Checkboxes
- Dropdowns
- Rating scales
- Matrix questions
- File uploads
- And many more...

## 🔒 Security Features

- Rate limiting on API endpoints
- CORS configuration
- Input validation
- Helmet.js for security headers
- IP address and user agent logging for responses

## 📊 Analytics & Reporting

The platform provides:
- Response count tracking
- Question-by-question analysis
- Export to Excel for advanced analytics
- Real-time result updates

## 🚀 Deployment

### Frontend (Netlify/Vercel)
```bash
npm run build
# Deploy the dist/ folder
```

### Backend (Heroku/Railway/DigitalOcean)
1. Set environment variables
2. Ensure MongoDB connection string is configured
3. Deploy the server/ directory

### Environment Variables for Production
```
NODE_ENV=production
MONGODB_URI=your-mongodb-connection-string
CLIENT_URL=your-frontend-domain
PORT=5000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please create an issue in the GitHub repository or contact the development team.

## 🔄 Updates & Maintenance

- Regularly update dependencies
- Monitor MongoDB performance
- Review and update security configurations
- Backup survey data regularly+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
