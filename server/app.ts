import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import reviewRoutes from './routes/review.js'
import templateRoutes from './routes/templates.js'
import dimensionRoutes from './routes/dimensions.js'
import authRoutes from './routes/auth.js'
import { authMiddleware, roleMiddleware, optionalAuth } from './middleware/auth.js'
import { isAIConfigured } from './services/aiReview.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)

app.use('/api/templates', (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'GET') {
    optionalAuth(req, res, next)
  } else if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    authMiddleware(req, res, () => {
      roleMiddleware('pro', 'admin')(req, res, next)
    })
  } else {
    next()
  }
}, templateRoutes)

app.use('/api/review', (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'GET') {
    optionalAuth(req, res, next)
  } else if (req.method === 'POST') {
    authMiddleware(req, res, next)
  } else {
    next()
  }
}, reviewRoutes)

app.use('/api/dimensions', dimensionRoutes)

app.get('/api/ai/status', (req: Request, res: Response): void => {
  const model = process.env.AI_MODEL || 'gpt-4o'
  const provider = process.env.AI_PROVIDER || 'openai'
  res.json({
    success: true,
    data: {
      configured: isAIConfigured(),
      model,
      provider,
    },
  })
})

app.post('/api/ai/config', (req: Request, res: Response): void => {
  const { api_key, api_base_url, model, provider } = req.body
  if (api_key) process.env.AI_API_KEY = api_key
  if (api_base_url) process.env.AI_API_BASE_URL = api_base_url
  if (model) process.env.AI_MODEL = model
  if (provider) process.env.AI_PROVIDER = provider
  res.json({
    success: true,
    data: {
      configured: isAIConfigured(),
      model: process.env.AI_MODEL || 'gpt-4o',
      provider: process.env.AI_PROVIDER || 'openai',
    },
  })
})

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
