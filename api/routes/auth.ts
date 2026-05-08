import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcryptjs from 'bcryptjs'
import db from '../db.js'
import { authMiddleware, roleMiddleware, generateToken } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req: Request, res: Response): void => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: '邮箱、密码和姓名不能为空' })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, error: '邮箱格式不正确' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: '密码长度不能少于6位' })
      return
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
    if (existingUser) {
      res.status(409).json({ success: false, error: '该邮箱已被注册' })
      return
    }

    const id = uuidv4()
    const hashedPassword = bcryptjs.hashSync(password, 10)

    db.prepare('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(
      id, email, hashedPassword, name, 'user'
    )

    const token = generateToken({ userId: id, email, role: 'user' })

    res.status(201).json({
      success: true,
      data: {
        user: { id, email, name, role: 'user' },
        token,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, error: '邮箱和密码不能为空' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
      id: string
      email: string
      password: string
      name: string
      role: string
    } | undefined

    if (!user) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' })
      return
    }

    if (!bcryptjs.compareSync(password, user.password)) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' })
      return
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role })

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  try {
    const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user!.userId) as {
      id: string
      email: string
      name: string
      role: string
      created_at: string
    } | undefined

    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({
      success: true,
      data: user,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

router.put('/profile', authMiddleware, (req: Request, res: Response): void => {
  try {
    const { name } = req.body

    if (name === undefined) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' })
      return
    }

    db.prepare('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, req.user!.userId)

    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user!.userId) as {
      id: string
      email: string
      name: string
      role: string
    }

    res.json({
      success: true,
      data: user,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新资料失败' })
  }
})

router.put('/upgrade', authMiddleware, roleMiddleware('user'), (req: Request, res: Response): void => {
  try {
    db.prepare("UPDATE users SET role = 'pro', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user!.userId)

    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user!.userId) as {
      id: string
      email: string
      name: string
      role: string
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role })

    res.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '升级失败' })
  }
})

export default router
