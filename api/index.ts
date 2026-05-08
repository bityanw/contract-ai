import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from './app.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await new Promise<void>((resolve, reject) => {
    app(req, res, (err: any) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
