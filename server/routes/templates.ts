import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import getDB from '../db.js'
const db = getDB()

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const category = req.query.category as string

    let templates
    if (category) {
      templates = db.prepare('SELECT * FROM templates WHERE category = ? ORDER BY is_builtin DESC, created_at DESC').all(category)
    } else {
      templates = db.prepare('SELECT * FROM templates ORDER BY is_builtin DESC, created_at DESC').all()
    }

    const templatesWithDimensions = templates.map((t: any) => {
      const dimensions = db.prepare('SELECT * FROM focus_dimensions WHERE template_id = ?').all(t.id)
      return { ...t, dimensions }
    })

    res.json({
      success: true,
      data: templatesWithDimensions,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取模板列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any

    if (!template) {
      res.status(404).json({ success: false, error: '模板不存在' })
      return
    }

    const dimensions = db.prepare('SELECT * FROM focus_dimensions WHERE template_id = ?').all(req.params.id)

    res.json({
      success: true,
      data: {
        ...template,
        dimensions,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取模板详情失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, description, category, system_prompt, dimensions } = req.body

    if (!name || !category || !system_prompt) {
      res.status(400).json({ success: false, error: '模板名称、分类和系统提示词不能为空' })
      return
    }

    const templateId = uuidv4()

    const insertTemplate = db.prepare(`
      INSERT INTO templates (id, name, description, category, system_prompt, is_builtin)
      VALUES (?, ?, ?, ?, ?, 0)
    `)
    insertTemplate.run(templateId, name, description || null, category, system_prompt)

    if (dimensions && Array.isArray(dimensions)) {
      const insertDimension = db.prepare(`
        INSERT INTO focus_dimensions (id, template_id, name, description, prompt, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const dim of dimensions) {
        if (dim.name && dim.prompt) {
          insertDimension.run(uuidv4(), templateId, dim.name, dim.description || null, dim.prompt, dim.enabled !== undefined ? (dim.enabled ? 1 : 0) : 1)
        }
      }
    }

    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as any
    const dims = db.prepare('SELECT * FROM focus_dimensions WHERE template_id = ?').all(templateId)

    res.status(201).json({
      success: true,
      data: {
        ...template,
        dimensions: dims,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建模板失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any

    if (!existing) {
      res.status(404).json({ success: false, error: '模板不存在' })
      return
    }

    if (existing.is_builtin) {
      res.status(403).json({ success: false, error: '内置模板不可修改' })
      return
    }

    const { name, description, category, system_prompt, dimensions } = req.body

    const updateTemplate = db.prepare(`
      UPDATE templates
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          system_prompt = COALESCE(?, system_prompt),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    updateTemplate.run(name || null, description !== undefined ? description : null, category || null, system_prompt || null, req.params.id)

    if (dimensions && Array.isArray(dimensions)) {
      db.prepare('DELETE FROM focus_dimensions WHERE template_id = ?').run(req.params.id)

      const insertDimension = db.prepare(`
        INSERT INTO focus_dimensions (id, template_id, name, description, prompt, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const dim of dimensions) {
        if (dim.name && dim.prompt) {
          insertDimension.run(dim.id || uuidv4(), req.params.id, dim.name, dim.description || null, dim.prompt, dim.enabled !== undefined ? (dim.enabled ? 1 : 0) : 1)
        }
      }
    }

    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any
    const dims = db.prepare('SELECT * FROM focus_dimensions WHERE template_id = ?').all(req.params.id)

    res.json({
      success: true,
      data: {
        ...template,
        dimensions: dims,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新模板失败' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any

    if (!template) {
      res.status(404).json({ success: false, error: '模板不存在' })
      return
    }

    if (template.is_builtin) {
      res.status(403).json({ success: false, error: '内置模板不可删除' })
      return
    }

    db.prepare('DELETE FROM focus_dimensions WHERE template_id = ?').run(req.params.id)
    db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id)

    res.json({
      success: true,
      data: null,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除模板失败' })
  }
})

export default router
