import React from 'react'
import { Link } from 'react-router-dom'

export const Home = () => {
  return (
    <div className="page-container">
      <div className="home-hero">
        <h1>Survey Platform</h1>
        <p>Create, share, and analyze surveys with ease</p>
        <Link to="/create" className="button">
          Create Your First Survey
        </Link>
      </div>
      
      <div className="features">
        <div className="feature">
          <h3>🎨 Design Surveys</h3>
          <p>Use our intuitive drag-and-drop survey creator to build professional surveys in minutes</p>
        </div>
        <div className="feature">
          <h3>🔗 Share Easily</h3>
          <p>Share your surveys via direct links and collect responses from anywhere</p>
        </div>
        <div className="feature">
          <h3>📊 Analyze Results</h3>
          <p>View real-time results and export data to Excel for detailed analysis</p>
        </div>
        <div className="feature">
          <h3>💾 Secure Storage</h3>
          <p>All survey data is securely stored in our MongoDB database</p>
        </div>
      </div>
    </div>
  )
}
