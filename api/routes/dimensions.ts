import { Router, type Request, type Response } from 'express'
import getDB from '../db.js'
const db = getDB()

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const templateId = req.query.template_id as string

    let dimensions
    if (templateId) {
      dimensions = db.prepare('SELECT * FROM focus_dimensions WHERE template_id = ? ORDER BY id').all(templateId)
    } else {
      dimensions = db.prepare('SELECT * FROM focus_dimensions ORDER BY template_id, id').all()
    }

    res.json({
      success: true,
      data: dimensions,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取关注维度失败' })
  }
})

export default router
