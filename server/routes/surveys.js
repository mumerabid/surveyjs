import express from 'express'
import XLSX from 'xlsx'
import { Model } from 'survey-core'
import { Survey } from '../models/Survey.js'

const router = express.Router()

// Serialize any SurveyJS answer value into a human-friendly string for Excel
// - Arrays => join with ", ", recursively serializing items
// - Objects => try to show meaningful text/value pairs; otherwise flatten to "k: v" pairs
// - Primitives => cast to string
const EXCEL_MAX_LEN = 32767
const clipExcelText = (text) => {
  const s = String(text ?? '')
  if (s.length <= EXCEL_MAX_LEN) return s
  // leave room for the truncated marker
  const marker = ' …[truncated]'
  const sliceLen = Math.max(0, EXCEL_MAX_LEN - marker.length)
  return s.slice(0, sliceLen) + marker
}

const serializeValue = (value) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    const joined = value.map((item) => serializeValue(item)).join(', ')
    return clipExcelText(joined)
  }
  if (typeof value === 'object') {
    // Common SurveyJS patterns
    // { text, value } => prefer text, fallback to value
    if (Object.prototype.hasOwnProperty.call(value, 'text') || Object.prototype.hasOwnProperty.call(value, 'value')) {
      const text = value.text
      const val = value.value
      if (text !== undefined && text !== null && String(text).trim() !== '') return clipExcelText(text)
      if (val !== undefined && val !== null) return clipExcelText(val)
    }

    // Plain object map => flatten entries
    try {
      const entries = Object.entries(value)
      if (entries.length === 0) return ''
      const flattened = entries.map(([k, v]) => `${k}: ${serializeValue(v)}`).join('; ')
      return clipExcelText(flattened)
    } catch {
      // Fallback to JSON
      try { return clipExcelText(JSON.stringify(value)) } catch { return clipExcelText(value) }
    }
  }
  // booleans/numbers/strings
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return clipExcelText(value)
}

// Build a map of question name -> { title, order } traversing SurveyJS JSON
const buildNameToTitleMap = (surveyJson) => {
  const map = {}
  let order = 0
  const visitElement = (el) => {
    if (!el || typeof el !== 'object') return
    if (el.name) {
      if (!map[el.name]) {
        map[el.name] = {
          title: el.title || el.titleExpanded || el.name,
          order: order++
        }
      }
    }
    // children containers
    if (Array.isArray(el.elements)) el.elements.forEach(visitElement)
    if (Array.isArray(el.templateElements)) el.templateElements.forEach(visitElement)
  }
  try {
    if (surveyJson?.pages && Array.isArray(surveyJson.pages)) {
      surveyJson.pages.forEach((p) => {
        visitElement(p)
        if (Array.isArray(p.elements)) p.elements.forEach(visitElement)
      })
    } else if (Array.isArray(surveyJson?.elements)) {
      surveyJson.elements.forEach(visitElement)
    }
  } catch {
    // ignore traversal errors
  }
  return map
}

// Flatten nested response data into path -> value map
// path uses " - " separator and indexes for arrays: parent[1] - child
const flattenResponseData = (data, out, path = '') => {
  if (data === null || data === undefined) return
  if (Array.isArray(data)) {
    if (data.length === 0) return
    // if array of primitives, store in current path as joined list
    const allPrimitives = data.every((d) => d === null || ['string', 'number', 'boolean'].includes(typeof d))
    if (allPrimitives) {
      out[path] = serializeValue(data)
      return
    }
    // array of objects: index and flatten each
    data.forEach((item, i) => {
      const nextPath = path ? `${path}[${i + 1}]` : `[${i + 1}]`
      flattenResponseData(item, out, nextPath)
    })
    return
  }
  if (typeof data === 'object') {
    Object.keys(data).forEach((k) => {
      const nextPath = path ? `${path} - ${k}` : k
      flattenResponseData(data[k], out, nextPath)
    })
    return
  }
  // primitive
  if (!path) return
  out[path] = serializeValue(data)
}

// Flatten SurveyJS plain data (from Model.getPlainData) into name-path -> value map
// Name path uses " - " with array indices kept if present in names from plain data (rare)
const flattenPlainItems = (items, out, namePath = []) => {
  if (!Array.isArray(items)) return
  items.forEach((item) => {
    if (!item) return
    if (item.isNode && Array.isArray(item.data)) {
      // Container node (panel/matrix row etc.)
      const nextNames = item.name ? [...namePath, item.name] : namePath
      flattenPlainItems(item.data, out, nextNames)
      return
    }
    // Leaf question
    const path = [...namePath, item.name].filter(Boolean).join(' - ')
    const value = item.displayValue !== undefined ? item.displayValue : item.value
    out[path] = serializeValue(value)
  })
}

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
//

// Model-mapped export (default)
router.get('/:id/export', async (req, res) => {
  try {
    const survey = await Survey.findOne({ id: req.params.id })
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }
    
    if (survey.responses.length === 0) {
      return res.status(400).json({ error: 'No responses to export' })
    }
    
  // Build name->title map from survey JSON
    let nameToTitle = {}
  try {
      const surveyJson = typeof survey.json === 'string' ? JSON.parse(survey.json) : survey.json
      nameToTitle = buildNameToTitleMap(surveyJson)
  } catch { /* ignore parse or mapping errors */ }

    // Flatten all responses using SurveyJS Model plain data to collect dynamic headers (paths)
    const flattenedRows = []
    const pathSet = new Set()
    survey.responses.forEach((response) => {
      const flat = {}
      try {
        const surveyJson = typeof survey.json === 'string' ? JSON.parse(survey.json) : survey.json
        const model = new Model(surveyJson)
        if (response && response.data && typeof response.data === 'object') {
          model.data = response.data
        }
        const plain = model.getPlainData({ includeEmpty: false })
        flattenPlainItems(plain, flat)
      } catch {
        // fallback to raw flatten if model fails
        if (response && response.data && typeof response.data === 'object') {
          flattenResponseData(response.data, flat)
        }
      }
      Object.keys(flat).forEach((p) => pathSet.add(p))
      flattenedRows.push({ flat, response })
    })

    // Label each path with a friendly header and dedupe collisions
    const labelByPath = new Map()
    const baseCount = new Map()
    pathSet.forEach((path) => {
      const segments = path.split(' - ')
      const last = segments[segments.length - 1]
      const lastName = last.replace(/\[[^\]]+\]$/, '')
      const meta = nameToTitle[lastName]
      const baseLabel = meta?.title ? `${path} - ${meta.title}` : path
      const n = baseCount.get(baseLabel) || 0
      const finalLabel = n === 0 ? baseLabel : `${baseLabel} (${n + 1})`
      baseCount.set(baseLabel, n + 1)
      labelByPath.set(path, finalLabel)
    })

    // Sort paths according to survey question order
    const orderOfName = (name) => (nameToTitle[name]?.order ?? 999999)
    const stripIndex = (seg) => seg.replace(/\[[^\]]+\]$/, '')
    const sortedPaths = Array.from(pathSet).sort((a, b) => {
      const as = a.split(' - ').map(stripIndex)
      const bs = b.split(' - ').map(stripIndex)
      const len = Math.max(as.length, bs.length)
      for (let i = 0; i < len; i++) {
        const ao = orderOfName(as[i] || '')
        const bo = orderOfName(bs[i] || '')
        if (ao !== bo) return ao - bo
      }
      return a.localeCompare(b)
    })

    // Build ordered headers and row objects
    const dynamicHeaders = sortedPaths.map((p) => labelByPath.get(p))
    const headers = ['Response ID', 'Submitted At', ...dynamicHeaders]
    const rows = flattenedRows.map(({ flat, response }) => {
      const row = {
        'Response ID': response.responseId || '',
        'Submitted At': response.submittedAt ? new Date(response.submittedAt).toISOString() : ''
      }
      sortedPaths.forEach((p, idx) => {
        const label = dynamicHeaders[idx]
        row[label] = flat[p] ?? ''
      })
      return row
    })

    // Codebook sheet: maps header -> path, name, title
    const codebook = dynamicHeaders.map((label, idx) => {
      const path = sortedPaths[idx]
      const lastSeg = (path.split(' - ').pop() || '')
      const name = lastSeg.replace(/\[[^\]]+\]$/, '')
      const title = nameToTitle[name]?.title || ''
      return { Header: label, Path: path, Name: name, Title: title }
    })
    // Build and send workbook with data and codebook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
    const colWidths = headers.map((header) => {
      const maxLength = Math.max(String(header).length, ...rows.map(r => String(r[header] ?? '').length))
      return { wch: Math.min(maxLength + 2, 50) }
    })
    ws['!cols'] = colWidths
    if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] }
    XLSX.utils.book_append_sheet(wb, ws, 'Survey Responses')
    const wsCodebook = XLSX.utils.json_to_sheet(codebook, { header: ['Header', 'Path', 'Name', 'Title'] })
    if (wsCodebook['!ref']) wsCodebook['!autofilter'] = { ref: wsCodebook['!ref'] }
    XLSX.utils.book_append_sheet(wb, wsCodebook, 'Codebook')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    const filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_responses_${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(excelBuffer)
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export responses', message: error.message })
  }
})

// Raw-flattened export without SurveyJS model mapping
router.get('/:id/export-raw', async (req, res) => {
  try {
    const survey = await Survey.findOne({ id: req.params.id })
    if (!survey) return res.status(404).json({ error: 'Survey not found' })
    if (survey.responses.length === 0) return res.status(400).json({ error: 'No responses to export' })

    // Build name->title map
    let nameToTitle = {}
  try {
      const surveyJson = typeof survey.json === 'string' ? JSON.parse(survey.json) : survey.json
      nameToTitle = buildNameToTitleMap(surveyJson)
  } catch { /* ignore parse or mapping errors */ }

    // Flatten using raw data
    const flattenedRows = []
    const pathSet = new Set()
    survey.responses.forEach((response) => {
      const flat = {}
      if (response && response.data && typeof response.data === 'object') {
        flattenResponseData(response.data, flat)
      }
      Object.keys(flat).forEach((p) => pathSet.add(p))
      flattenedRows.push({ flat, response })
    })

    // Labels and sorting (same as model route)
    const labelByPath = new Map()
    const baseCount = new Map()
    pathSet.forEach((path) => {
      const segments = path.split(' - ')
      const last = segments[segments.length - 1]
      const lastName = last.replace(/\[[^\]]+\]$/, '')
      const meta = nameToTitle[lastName]
      const baseLabel = meta?.title ? `${path} - ${meta.title}` : path
      const n = baseCount.get(baseLabel) || 0
      const finalLabel = n === 0 ? baseLabel : `${baseLabel} (${n + 1})`
      baseCount.set(baseLabel, n + 1)
      labelByPath.set(path, finalLabel)
    })

    const orderOfName = (name) => (nameToTitle[name]?.order ?? 999999)
    const stripIndex = (seg) => seg.replace(/\[[^\]]+\]$/, '')
    const sortedPaths = Array.from(pathSet).sort((a, b) => {
      const as = a.split(' - ').map(stripIndex)
      const bs = b.split(' - ').map(stripIndex)
      const len = Math.max(as.length, bs.length)
      for (let i = 0; i < len; i++) {
        const ao = orderOfName(as[i] || '')
        const bo = orderOfName(bs[i] || '')
        if (ao !== bo) return ao - bo
      }
      return a.localeCompare(b)
    })

    const dynamicHeaders = sortedPaths.map((p) => labelByPath.get(p))
    const headers = ['Response ID', 'Submitted At', ...dynamicHeaders]
    const rows = flattenedRows.map(({ flat, response }) => {
      const row = {
        'Response ID': response.responseId || '',
        'Submitted At': response.submittedAt ? new Date(response.submittedAt).toISOString() : ''
      }
      sortedPaths.forEach((p, idx) => {
        const label = dynamicHeaders[idx]
        row[label] = flat[p] ?? ''
      })
      return row
    })

    // Codebook
    const codebook = dynamicHeaders.map((label, idx) => {
      const path = sortedPaths[idx]
      const lastSeg = (path.split(' - ').pop() || '')
      const name = lastSeg.replace(/\[[^\]]+\]$/, '')
      const title = nameToTitle[name]?.title || ''
      return { Header: label, Path: path, Name: name, Title: title }
    })

    // Build workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
    const colWidths = headers.map((header) => {
      const maxLength = Math.max(String(header).length, ...rows.map(r => String(r[header] ?? '').length))
      return { wch: Math.min(maxLength + 2, 50) }
    })
    ws['!cols'] = colWidths
    if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] }
    XLSX.utils.book_append_sheet(wb, ws, 'Survey Responses')
    const wsCodebook = XLSX.utils.json_to_sheet(codebook, { header: ['Header', 'Path', 'Name', 'Title'] })
    if (wsCodebook['!ref']) wsCodebook['!autofilter'] = { ref: wsCodebook['!ref'] }
    XLSX.utils.book_append_sheet(wb, wsCodebook, 'Codebook')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    const filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_responses_raw_${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(excelBuffer)
  } catch (error) {
    console.error('Export raw error:', error)
    res.status(500).json({ error: 'Failed to export responses (raw)', message: error.message })
  }
})

export default router
