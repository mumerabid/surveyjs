import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
// const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ebmpk.a.pinggy.link/api"

class SurveyService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Survey CRUD operations
  async createSurvey(surveyData) {
    const response = await this.api.post('/surveys', surveyData)
    return response.data
  }

  async getAllSurveys() {
    const response = await this.api.get('/surveys')
    return response.data
  }

  async getSurvey(id) {
    const response = await this.api.get(`/surveys/${id}`)
    return response.data
  }

  async updateSurvey(id, updates) {
    const response = await this.api.put(`/surveys/${id}`, updates)
    return response.data
  }

  async deleteSurvey(id) {
    const response = await this.api.delete(`/surveys/${id}`)
    return response.data
  }

  // Response operations
  async submitResponse(surveyId, responseData) {
    const response = await this.api.post(`/surveys/${surveyId}/responses`, responseData)
    return response.data
  }

  async getResponses(surveyId) {
    const response = await this.api.get(`/surveys/${surveyId}/responses`)
    return response.data
  }

  // Export functionality
  async exportToExcel(surveyId) {
    const response = await this.api.get(`/surveys/${surveyId}/export`, {
      responseType: 'blob'
    })
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Get filename from response headers or use default
    const contentDisposition = response.headers['content-disposition']
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1]?.replace(/['"]/g, '')
      : `survey-${surveyId}-responses.xlsx`
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }
}

export const surveyService = new SurveyService()
