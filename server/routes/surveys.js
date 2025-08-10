import express from 'express'
import XLSX from 'xlsx'
import { Survey } from '../models/Survey.js'

const router = express.Router()

// Get all surveys
router.get('/', async (req, res) => {
  try {
    const surveys = await Survey.find({}, '-responses')
      .sort({ createdAt: -1 })
    res.json(surveys)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch surveys', message: error.message })
  }
})

// Get single survey
router.get('/:id', async (req, res) => {
  try {
    const survey = await Survey.findOne({ id: req.params.id }, '-responses')
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }
    res.json(survey)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch survey', message: error.message })
  }
})

// Create new survey
router.post('/', async (req, res) => {
  try {
    const surveyData = req.body
    
    // Validate required fields
    if (!surveyData.id || !surveyData.title || !surveyData.json) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, title, and json are required' 
      })
    }
    
    // Check if survey with this ID already exists
    const existingSurvey = await Survey.findOne({ id: surveyData.id })
    if (existingSurvey) {
      return res.status(409).json({ error: 'Survey with this ID already exists' })
    }
    
    const survey = new Survey(surveyData)
    await survey.save()
    
    res.status(201).json(survey)
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Survey with this ID already exists' })
    } else {
      res.status(500).json({ error: 'Failed to create survey', message: error.message })
    }
  }
})

// Update survey
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body
    updates.updatedAt = new Date()
    
    const survey = await Survey.findOneAndUpdate(
      { id: req.params.id },
      updates,
      { new: true, runValidators: true }
    )
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }
    
    res.json(survey)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update survey', message: error.message })
  }
})

// Delete survey
router.delete('/:id', async (req, res) => {
  try {
    const survey = await Survey.findOneAndDelete({ id: req.params.id })
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }
    res.json({ message: 'Survey deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete survey', message: error.message })
  }
})

// Submit response to survey
router.post('/:id/responses', async (req, res) => {
  try {
    const surveyId = req.params.id
    const responseData = req.body
    
    // Validate response data
    if (!responseData.data) {
      return res.status(400).json({ error: 'Response data is required' })
    }
    
    const survey = await Survey.findOne({ id: surveyId })
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }
    
    if (!survey.isActive) {
      return res.status(403).json({ error: 'Survey is not active' })
    }
    
    // Add IP and user agent for analytics (optional)
    const response = {
      ...responseData,
      responseId: responseData.responseId || Date.now().toString(),
      submittedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    }
    
    survey.responses.push(response)
    await survey.save()
    
    res.status(201).json({ message: 'Response submitted successfully', responseId: response.responseId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit response', message: error.message })
  }
})

// Get survey responses
router.get('/:id/responses', async (req, res) => {
  try {
    const survey = await Survey.findOne({ id: req.params.id })
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }
    
    res.json(survey.responses)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch responses', message: error.message })
  }
})

// Export responses to Excel
router.get('/:id/export', async (req, res) => {
  try {
    const survey = await Survey.findOne({ id: req.params.id })
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }
    
    if (survey.responses.length === 0) {
      return res.status(400).json({ error: 'No responses to export' })
    }
    
    // Get all unique question names from all responses
    const allQuestions = new Set()
    survey.responses.forEach(response => {
      Object.keys(response.data).forEach(key => allQuestions.add(key))
    })
    
    // Create Excel data
    const excelData = []
    
    // Header row
    const headers = ['Response ID', 'Submitted At', ...Array.from(allQuestions)]
    excelData.push(headers)
    
    // Data rows
    survey.responses.forEach(response => {
      const row = [
        response.responseId,
        new Date(response.submittedAt).toLocaleString(),
        ...Array.from(allQuestions).map(question => {
          const value = response.data[question]
          // Handle arrays and objects
          if (Array.isArray(value)) {
            return value.join(', ')
          } else if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value)
          }
          return value || ''
        })
      ]
      excelData.push(row)
    })
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Auto-size columns
    const colWidths = headers.map((header, i) => {
      const maxLength = Math.max(
        header.length,
        ...excelData.slice(1).map(row => String(row[i] || '').length)
      )
      return { wch: Math.min(maxLength + 2, 50) }
    })
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, 'Survey Responses')
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    
    // Set response headers
    const filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_responses_${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    res.send(excelBuffer)
  } catch (error) {
    res.status(500).json({ error: 'Failed to export responses', message: error.message })
  }
})

export default router
