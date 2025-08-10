import React from 'react'
import { Link } from 'react-router-dom'

export const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/dashboard" className="logo">
          SurveyJS Platform
        </Link>
        <nav className="nav">
          <Link to="/create">Create Survey</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </div>
    </header>
  )
}
