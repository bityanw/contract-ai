import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from './app.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  app(req as any, res as any, (err: any) => {
    if (err) {
      res.status(500).json({ success: false, error: 'Internal Server Error' })
    }
  })
}
