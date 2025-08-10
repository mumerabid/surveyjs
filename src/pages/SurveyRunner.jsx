import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Survey } from 'survey-react-ui'
import { Model } from 'survey-core'
import { surveyService } from '../services/surveyService'
import 'survey-core/survey-core.css'

export const SurveyRunner = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        setLoading(true)
        const surveyData = await surveyService.getSurvey(id)
        
        if (!surveyData.isActive) {
          setError('This survey is no longer active')
          return
        }
        
        const surveyModel = new Model(surveyData.json)
        
        // Configure survey settings
        surveyModel.showCompletedPage = false
        surveyModel.showProgressBar = 'top'
        surveyModel.progressBarType = 'pages'
        
        // Handle survey completion
        surveyModel.onComplete.add(async (sender) => {
          console.log(sender)
          try {
            await surveyService.submitResponse(id, {
              responseId: Date.now().toString(),
              data: sender.data,
              submittedAt: new Date().toISOString()
            })
            setSubmitted(true)
          } catch (err) {
            setError('Failed to submit response: ' + err.message)
          }
        })
        
        setSurvey(surveyModel)
      } catch (err) {
        setError('Failed to load survey: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadSurvey()
  }, [id])

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading survey...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">{error}</div>
        <button className="button" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>Thank You!</h2>
          <p>Your response has been submitted successfully.</p>
          <button className="button" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {survey && <Survey model={survey} />}
      </div>
    </div>
  )
}
