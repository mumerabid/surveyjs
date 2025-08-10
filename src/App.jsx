import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { SurveyCreatorPage } from './pages/SurveyCreator'
import { SurveyRunner } from './pages/SurveyRunner'
import { Dashboard } from './pages/Dashboard'
import { SurveyResults } from './pages/SurveyResults'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<main className="main-content"><Dashboard /></main>} />
          <Route path="/create" element={<main className="main-content-full"><SurveyCreatorPage /></main>} />
          <Route path="/survey/:id" element={<main className="main-content"><SurveyRunner /></main>} />
          <Route path="/dashboard" element={<main className="main-content"><Dashboard /></main>} />
          <Route path="/results/:id" element={<main className="main-content"><SurveyResults /></main>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
