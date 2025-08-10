import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { surveyService } from '../services/surveyService'

export const Dashboard = () => {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSurveys()
  }, [])

  const loadSurveys = async () => {
    try {
      setLoading(true)
      const data = await surveyService.getAllSurveys()
      setSurveys(data)
    } catch (err) {
      setError('Failed to load surveys: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteSurvey = async (id) => {
    if (!window.confirm('Are you sure you want to delete this survey?')) {
      return
    }
    
    try {
      await surveyService.deleteSurvey(id)
      setSurveys(surveys.filter(survey => survey.id !== id))
    } catch (err) {
      setError('Failed to delete survey: ' + err.message)
    }
  }

  const toggleSurveyStatus = async (id, isActive) => {
    try {
      await surveyService.updateSurvey(id, { isActive: !isActive })
      setSurveys(surveys.map(survey => 
        survey.id === id ? { ...survey, isActive: !isActive } : survey
      ))
    } catch (err) {
      setError('Failed to update survey: ' + err.message)
    }
  }

  const copyLink = (surveyId) => {
    const link = `${window.location.origin}/survey/${surveyId}`
    navigator.clipboard.writeText(link)
    alert('Survey link copied to clipboard!')
  }

  const downloadSurveyTemplate = (survey) => {
    try {
      // Create the survey template (without responses)
      const surveyTemplate = {
        ...survey.json,
        title: survey.title + ' (Template)',
        description: survey.description ? survey.description + ' - Copied from original survey' : 'Survey template'
      }

      // Create and download the JSON file
      const dataStr = JSON.stringify(surveyTemplate, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${survey.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download survey template: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading surveys...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title">Survey Dashboard</h1>
        <Link to="/create" className="button">
          Create New Survey
        </Link>
      </div>

      {error && <div className="error">{error}</div>}

      {surveys.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>No surveys yet</h3>
          <p>Create your first survey to get started!</p>
          <Link to="/create" className="button">
            Create Survey
          </Link>
        </div>
      ) : (
        <div className="survey-list">
          {surveys.map(survey => (
            <div key={survey.id} className="survey-row">
              <div className="survey-info">
                <div className="survey-header">
                  <h3 className="survey-title">📋 {survey.title}</h3>
                  <div className="survey-meta">
                    <span className={`status-badge ${survey.isActive ? 'active' : 'inactive'}`}>
                      {survey.isActive ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                    <span className="response-count">
                      📊 {survey.responseCount || 0} responses
                    </span>
                    <span className="created-date">
                      📅 {new Date(survey.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="survey-description">{survey.description || 'No description'}</p>
                
                <div className="survey-link">
                  <span className="link-label">🔗 Survey Link:</span>
                  <input
                    type="text"
                    value={`${window.location.origin}/survey/${survey.id}`}
                    readOnly
                    className="link-input"
                  />
                  <button
                    className="copy-button"
                    onClick={() => copyLink(survey.id)}
                    title="Copy survey link"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="survey-actions">
                <Link 
                  to={`/results/${survey.id}`} 
                  className="action-button results"
                  title="View survey results and analytics"
                >
                  📈 Results
                </Link>
                <button
                  className="action-button template"
                  onClick={() => downloadSurveyTemplate(survey)}
                  title="Download survey as JSON template for reuse"
                >
                  📄 Template
                </button>
                <button
                  className={`action-button ${survey.isActive ? 'deactivate' : 'activate'}`}
                  onClick={() => toggleSurveyStatus(survey.id, survey.isActive)}
                  title={survey.isActive ? 'Stop accepting responses' : 'Start accepting responses'}
                >
                  {survey.isActive ? '⏸️ Pause' : '▶️ Start'}
                </button>
                <button
                  className="action-button delete"
                  onClick={() => deleteSurvey(survey.id)}
                  title="Delete survey permanently"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
