import React, { useState, useCallback } from 'react'
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { surveyService } from '../services/surveyService'

// SurveyJS Creator license (for production, you'll need a proper license)
import 'survey-core/survey-core.css'
import 'survey-creator-core/survey-creator-core.css'

const creatorOptions = {
  showLogicTab: true,
  isAutoSave: false
}

// Add custom image upload functionality
const setupCustomImageUpload = (creator) => {
  // Custom file upload handler
  creator.onUploadFile.add((survey, options) => {
    const formData = new FormData()
    formData.append('file', options.file)
    
    // Upload to your backend
    fetch(`${import.meta.env.VITE_API_URL || "https://ebmpk.a.pinggy.link/api"}/upload`, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(result => {
      if (result.fileUrl) {
        // Return the file URL to SurveyJS
        options.callback('success', `${import.meta.env.VITE_API_URL || "https://ebmpk.a.pinggy.link"}${result.fileUrl}`)
      } else {
        options.callback('error', 'Upload failed')
      }
    })
    .catch(error => {
      console.error('Upload error:', error)
      options.callback('error', error.message)
    })
  })
}

export const SurveyCreatorPage = () => {
  const [creator] = useState(() => {
    const newCreator = new SurveyCreator(creatorOptions)
    setupCustomImageUpload(newCreator)
    return newCreator
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const saveSurvey = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const surveyJSON = creator.JSON
      
      // Validate that survey has at least one page and one question
      if (!surveyJSON.pages || surveyJSON.pages.length === 0) {
        setError('Survey must have at least one page')
        return
      }
      
      const hasQuestions = surveyJSON.pages.some(page => 
        page.elements && page.elements.length > 0
      )
      
      if (!hasQuestions) {
        setError('Survey must have at least one question')
        return
      }
      
      // Add metadata
      const surveyData = {
        id: uuidv4(),
        title: surveyJSON.title || 'Untitled Survey',
        description: surveyJSON.description || '',
        json: surveyJSON,
        createdAt: new Date().toISOString(),
        isActive: true,
        responseCount: 0
      }
      
      await surveyService.createSurvey(surveyData)
      navigate('/dashboard')
      
    } catch (err) {
      setError('Failed to save survey: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [creator, navigate])

  const importTemplate = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const surveyJSON = JSON.parse(e.target.result)
            // Clear existing survey and load the template
            creator.JSON = surveyJSON
            setError('')
          } catch (error) {
            setError('Invalid JSON file: ' + error.message)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [creator])

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title">Create Survey</h1>
        <div>
          <button 
            className="button info" 
            onClick={importTemplate}
            style={{ marginRight: '1rem' }}
            title="Import a survey template from JSON file"
          >
            📁 Import Template
          </button>
          <button 
            className="button secondary" 
            onClick={() => navigate('/dashboard')}
            style={{ marginRight: '1rem' }}
          >
            Cancel
          </button>
          <button 
            className="button success" 
            onClick={saveSurvey}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Survey'}
          </button>
        </div>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <div className="survey-creator-container">
        <SurveyCreatorComponent creator={creator} />
      </div>
    </div>
  )
}
