import mongoose from 'mongoose'

const responseSchema = new mongoose.Schema({
  responseId: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String
})

const surveySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  json: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  responseCount: {
    type: Number,
    default: 0
  },
  responses: [responseSchema]
}, {
  timestamps: true
})

// Update responseCount when responses are added
surveySchema.pre('save', function(next) {
  this.responseCount = this.responses.length
  next()
})

// Indexes for better performance
surveySchema.index({ id: 1 })
surveySchema.index({ createdAt: -1 })
surveySchema.index({ isActive: 1 })

export const Survey = mongoose.model('Survey', surveySchema)
