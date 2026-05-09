import { v4 as uuidv4 } from 'uuid'
import bcryptjs from 'bcryptjs'

const isVercel = !!process.env.VERCEL

interface TemplateRecord {
  id: string; name: string; description: string; category: string; system_prompt: string; is_builtin: number; created_at: string; updated_at: string
}
interface DimensionRecord {
  id: string; template_id: string; name: string; description: string; prompt: string; enabled: number
}
interface UserRecord {
  id: string; email: string; password: string; name: string; role: string; created_at: string; updated_at: string
}
interface ContractRecord {
  id: string; title: string; content: string; source: string; created_at: string
}
interface ReviewRecord {
  id: string; contract_id: string; template_id: string | null; custom_prompt: string | null; strictness: string; overall_score: number | null; summary: string | null; risk_distribution: string | null; status: string; created_at: string
}
interface FindingRecord {
  id: string; review_id: string; clause_index: number | null; original_text: string | null; risk_level: string; category: string | null; description: string | null; suggestion: string | null; related_law: string | null
}

class MemoryDB {
  templates: TemplateRecord[] = []
  dimensions: DimensionRecord[] = []
  users: UserRecord[] = []
  contracts: ContractRecord[] = []
  reviews: ReviewRecord[] = []
  findings: FindingRecord[] = []

  prepare(sql: string) {
    const table = sql.match(/FROM\s+(\w+)/i)?.[1] || sql.match(/INTO\s+(\w+)/i)?.[1] || sql.match(/UPDATE\s+(\w+)/i)?.[1] || ''
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT')
    const isInsert = sql.trim().toUpperCase().startsWith('INSERT')
    const isUpdate = sql.trim().toUpperCase().startsWith('UPDATE')
    const isDelete = sql.trim().toUpperCase().startsWith('DELETE')

    return {
      run: (...params: any[]) => {
        const obj = params[0] && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] as Record<string, any> : null
        const arr = Array.isArray(params[0]) ? params[0] : params

        if (isInsert) {
          const t = this.getTable(table)
          if (t) {
            const record: any = {}
            if (obj) {
              const cols = sql.match(/\(([^)]+)\)/)?.[1]?.split(',').map(s => s.trim().replace('@', ''))
              const vals = sql.match(/VALUES\s*\(([^)]+)\)/i)?.[1]?.split(',').map(s => s.trim().replace('@', ''))
              if (cols && vals) {
                cols.forEach((col, i) => {
                  const key = vals[i]
                  record[col] = key.startsWith('@') ? obj[key.slice(1)] : obj[key] || key.replace(/'/g, '')
                })
              }
            } else {
              const colMatch = sql.match(/\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i)
              if (colMatch) {
                const cols = colMatch[1].split(',').map(s => s.trim())
                const valPlaceholders = colMatch[2].split(',').map(s => s.trim())
                cols.forEach((col, i) => {
                  record[col] = valPlaceholders[i] === '?' ? arr[i] : valPlaceholders[i]
                })
              }
            }
            if (Object.keys(record).length > 0) t.push(record)
          }
          return { changes: 1, lastInsertRowid: 0 }
        }

        if (isUpdate) {
          return { changes: 1 }
        }

        if (isDelete) {
          return { changes: 0 }
        }

        return { changes: 0 }
      },
      get: (...params: any[]) => {
        const arr = Array.isArray(params[0]) ? params[0] : params
        const t = this.getTable(table)
        if (!t || !isSelect) return undefined

        if (sql.includes('COUNT(*)')) {
          let filtered = [...t]
          const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i)
          if (whereMatch) {
            filtered = this.applyWhere(filtered, whereMatch[1], arr)
          }
          return { count: filtered.length }
        }

        let filtered = [...t]
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i)
        if (whereMatch) {
          filtered = this.applyWhere(filtered, whereMatch[1], arr)
        }
        return filtered[0] || undefined
      },
      all: (...params: any[]) => {
        const arr = Array.isArray(params[0]) ? params[0] : params
        const t = this.getTable(table)
        if (!t || !isSelect) return []

        let filtered = [...t]
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i)
        if (whereMatch) {
          filtered = this.applyWhere(filtered, whereMatch[1], arr)
        }
        return filtered
      },
    }
  }

  private getTable(name: string): any[] {
    const map: Record<string, any[]> = {
      templates: this.templates,
      focus_dimensions: this.dimensions,
      users: this.users,
      contracts: this.contracts,
      reviews: this.reviews,
      findings: this.findings,
    }
    return map[name] || []
  }

  private applyWhere(rows: any[], where: string, params: any[]): any[] {
    let paramIdx = 0
    let result = rows

    const emailMatch = where.match(/email\s*=\s*\?/i)
    if (emailMatch) {
      const val = params[paramIdx++]
      result = result.filter(r => r.email === val)
    }

    const idMatch = where.match(/(\w+)\.id\s*=\s*\?/i)
    if (idMatch) {
      const col = idMatch[1] === idMatch[1].toLowerCase() ? 'id' : 'id'
      const val = params[paramIdx++]
      result = result.filter(r => r.id === val)
    }

    const templateIdMatch = where.match(/template_id\s*=\s*\?/i)
    if (templateIdMatch) {
      const val = params[paramIdx++]
      result = result.filter(r => r.template_id === val)
    }

    const reviewIdMatch = where.match(/review_id\s*=\s*\?/i)
    if (reviewIdMatch) {
      const val = params[paramIdx++]
      result = result.filter(r => r.review_id === val)
    }

    const contractIdMatch = where.match(/contract_id\s*=\s*\?/i)
    if (contractIdMatch) {
      const val = params[paramIdx++]
      result = result.filter(r => r.contract_id === val)
    }

    const isBuiltinMatch = where.match(/is_builtin\s*=\s*(\d+)/i)
    if (isBuiltinMatch) {
      const val = parseInt(isBuiltinMatch[1])
      result = result.filter(r => r.is_builtin === val)
    }

    const statusMatch = where.match(/status\s*=\s*\?/i)
    if (statusMatch) {
      const val = params[paramIdx++]
      result = result.filter(r => r.status === val)
    }

    return result
  }

  exec(_sql: string) {}

  pragma(_s: string) {}

  transaction(fn: () => void) {
    fn()
  }
}

function createSeedData() {
  const mem = new MemoryDB()
  const now = new Date().toISOString()

  const seedTemplates = [
    { name: '劳动合同审核模板', description: '适用于劳动合同的全面法律审核', category: 'labor', system_prompt: '你是一名专业的劳动法律师，擅长审核劳动合同。请根据《中华人民共和国劳动法》《中华人民共和国劳动合同法》及相关法规，对劳动合同进行全面审核。重点关注薪资条款、工时约定、解除条件、竞业限制、社保缴纳等方面，识别可能损害劳动者或用人单位合法权益的条款，并提供专业修改建议。审核结果需包含风险等级、具体问题描述和法律依据。', dimensions: [
      { name: '薪资条款', description: '审核薪资构成、支付方式、加班费计算等条款', prompt: '请重点审核合同中关于薪资的条款，包括薪资构成、支付周期、加班费计算基数、克扣工资条款、薪资调整机制。请依据《劳动合同法》相关规定进行审核。' },
      { name: '工时约定', description: '审核工作时间、休息休假、加班安排等条款', prompt: '请重点审核合同中关于工时的条款，包括工作时间标准、休息日安排、加班时长上限、强制加班条款、年休假安排。请依据《劳动法》相关规定进行审核。' },
      { name: '解除条件', description: '审核合同解除、终止条件及经济补偿条款', prompt: '请重点审核合同中关于解除条件的条款，包括用人单位单方解除条件、劳动者解除权、经济补偿金标准、违约金条款。请依据《劳动合同法》相关规定进行审核。' },
      { name: '竞业限制', description: '审核竞业限制范围、期限、补偿等条款', prompt: '请重点审核合同中关于竞业限制的条款，包括适用人员范围、限制期限、补偿金标准、限制范围。请依据《劳动合同法》第二十三条、第二十四条进行审核。' },
      { name: '社保缴纳', description: '审核社会保险和住房公积金缴纳条款', prompt: '请重点审核合同中关于社保缴纳的条款，包括社保缴纳约定、现金替代条款、五险齐全、公积金约定。请依据《社会保险法》进行审核。' },
    ]},
    { name: '租赁合同审核模板', description: '适用于房屋及场地租赁合同的全面法律审核', category: 'lease', system_prompt: '你是一名专业的房地产法律师，擅长审核租赁合同。请根据《中华人民共和国民法典》合同编及相关法规，对租赁合同进行全面审核。重点关注租金条款、维修责任、违约条款、续租条件、押金退还等方面。', dimensions: [
      { name: '租金条款', description: '审核租金标准、支付方式、调整机制等条款', prompt: '请重点审核租金标准、支付方式、调整机制、隐性收费、免租期约定。请依据《民法典》相关规定进行审核。' },
      { name: '维修责任', description: '审核租赁物维修、保养责任划分条款', prompt: '请重点审核出租方维修义务、承租方维护责任、维修费用承担。请依据《民法典》第七百一十二条进行审核。' },
      { name: '违约条款', description: '审核违约情形、违约金、解除权等条款', prompt: '请重点审核违约情形、违约金标准、单方解除权、滞纳金条款。请依据《民法典》相关规定进行审核。' },
      { name: '续租条件', description: '审核续租优先权、续租程序等条款', prompt: '请重点审核优先续租权、续租通知期限、租金确定方式。请依据《民法典》第七百三十四条进行审核。' },
      { name: '押金退还', description: '审核押金金额、扣除条件、退还程序等条款', prompt: '请重点审核押金金额、扣除情形、退还时间、不合理扣款条款。请依据《民法典》相关规定进行审核。' },
    ]},
    { name: '采购合同审核模板', description: '适用于物资及设备采购合同的全面法律审核', category: 'procurement', system_prompt: '你是一名专业的商事法律师，擅长审核采购合同。请根据《中华人民共和国民法典》合同编及相关法规，对采购合同进行全面审核。重点关注价格条款、交付条件、质量标准、违约责任、付款条件等方面。', dimensions: [
      { name: '价格条款', description: '审核价格构成、调价机制、税费承担等条款', prompt: '请重点审核价格构成、调价机制、税费承担。请依据《民法典》相关规定进行审核。' },
      { name: '交付条件', description: '审核交付时间、地点、方式、验收等条款', prompt: '请重点审核交付时间、地点、风险转移、验收标准。请依据《民法典》相关规定进行审核。' },
      { name: '质量标准', description: '审核质量要求、检验期、质保期等条款', prompt: '请重点审核质量标准、检验期、质保期、不合格品处理。请依据《民法典》相关规定进行审核。' },
      { name: '违约责任', description: '审核违约情形、违约金、损害赔偿等条款', prompt: '请重点审核违约情形、违约金计算、损害赔偿范围、免责条款。请依据《民法典》相关规定进行审核。' },
      { name: '付款条件', description: '审核付款方式、付款期限、发票要求等条款', prompt: '请重点审核付款方式、付款节点、发票要求、预付款风险。请依据《民法典》相关规定进行审核。' },
    ]},
    { name: '服务合同审核模板', description: '适用于专业服务合同的全面法律审核', category: 'service', system_prompt: '你是一名专业的商事法律师，擅长审核服务合同。请根据《中华人民共和国民法典》合同编及相关法规，对服务合同进行全面审核。重点关注服务范围、SLA标准、费用条款、知识产权、保密条款等方面。', dimensions: [
      { name: '服务范围', description: '审核服务内容、交付物、变更机制等条款', prompt: '请重点审核服务内容描述、交付物标准、变更流程。请依据《民法典》相关规定进行审核。' },
      { name: 'SLA标准', description: '审核服务等级协议、响应时间、可用性等条款', prompt: '请重点审核可用性指标、响应时间、赔偿机制。请依据《民法典》相关规定进行审核。' },
      { name: '费用条款', description: '审核费用构成、支付方式、调整机制等条款', prompt: '请重点审核费用构成、付款方式、调整条件、隐性费用。请依据《民法典》相关规定进行审核。' },
      { name: '知识产权', description: '审核知识产权归属、许可、侵权等条款', prompt: '请重点审核知识产权归属、许可范围、侵权担保。请依据《著作权法》《专利法》进行审核。' },
      { name: '保密条款', description: '审核保密范围、期限、违约责任等条款', prompt: '请重点审核保密信息范围、保密期限、违约责任。请依据《反不正当竞争法》进行审核。' },
    ]},
    { name: '保密协议审核模板', description: '适用于保密协议（NDA）的全面法律审核', category: 'nda', system_prompt: '你是一名专业的知识产权法律师，擅长审核保密协议。请根据《中华人民共和国反不正当竞争法》《中华人民共和国民法典》及相关法规，对保密协议进行全面审核。重点关注保密范围、期限约定、违约责任、例外条款、归还义务等方面。', dimensions: [
      { name: '保密范围', description: '审核保密信息定义、范围界定、标记要求等条款', prompt: '请重点审核保密信息定义、范围界定、标记要求。请依据《反不正当竞争法》第九条进行审核。' },
      { name: '期限约定', description: '审核保密期限、持续义务、终止条件等条款', prompt: '请重点审核保密期限、持续义务、终止条件。请依据《民法典》相关规定进行审核。' },
      { name: '违约责任', description: '审核违约情形、损害赔偿、救济措施等条款', prompt: '请重点审核违约情形、损害赔偿、禁令救济。请依据《民法典》相关规定进行审核。' },
      { name: '例外条款', description: '审核保密例外情形、独立开发、合法获取等条款', prompt: '请重点审核保密例外情形、独立开发举证、强制披露处理。请依据《反不正当竞争法》进行审核。' },
      { name: '归还义务', description: '审核信息归还、销毁、确认等条款', prompt: '请重点审核信息归还时限、销毁方式、确认程序。请依据《民法典》相关规定进行审核。' },
    ]},
  ]

  for (const t of seedTemplates) {
    const tId = uuidv4()
    mem.templates.push({ id: tId, name: t.name, description: t.description, category: t.category, system_prompt: t.system_prompt, is_builtin: 1, created_at: now, updated_at: now })
    for (const d of t.dimensions) {
      mem.dimensions.push({ id: uuidv4(), template_id: tId, name: d.name, description: d.description, prompt: d.prompt, enabled: 1 })
    }
  }

  mem.users.push({ id: uuidv4(), email: 'admin@contractai.com', password: bcryptjs.hashSync('admin123', 10), name: '系统管理员', role: 'admin', created_at: now, updated_at: now })

  return mem
}

let _sqliteDb: any = null
let _memDb: MemoryDB | null = null

function getDB(): any {
  if (isVercel) {
    if (!_memDb) {
      _memDb = createSeedData()
    }
    return _memDb
  }

  if (!_sqliteDb) {
    let Database: any = null
    try {
      Database = require('better-sqlite3')
    } catch {
      if (!_memDb) {
        _memDb = createSeedData()
      }
      return _memDb
    }

    const path = require('path')
    const fs = require('fs')

    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

    _sqliteDb = new Database(path.join(dataDir, 'contract_review.db'))
    _sqliteDb.pragma('journal_mode = WAL')
    _sqliteDb.pragma('foreign_keys = ON')

    _sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, source TEXT DEFAULT 'paste', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, category TEXT NOT NULL, system_prompt TEXT NOT NULL, is_builtin BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS focus_dimensions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, prompt TEXT NOT NULL, enabled BOOLEAN DEFAULT 1, FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, contract_id TEXT NOT NULL, template_id TEXT, custom_prompt TEXT, strictness TEXT DEFAULT 'medium', overall_score INTEGER, summary TEXT, risk_distribution TEXT, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (contract_id) REFERENCES contracts(id), FOREIGN KEY (template_id) REFERENCES templates(id));
      CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, review_id TEXT NOT NULL, clause_index INTEGER, original_text TEXT, risk_level TEXT NOT NULL, category TEXT, description TEXT, suggestion TEXT, related_law TEXT, FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_reviews_contract ON reviews(contract_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
      CREATE INDEX IF NOT EXISTS idx_findings_review ON findings(review_id);
      CREATE INDEX IF NOT EXISTS idx_findings_risk ON findings(risk_level);
      CREATE INDEX IF NOT EXISTS idx_dimensions_template ON focus_dimensions(template_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `)

    const existingCount = _sqliteDb.prepare('SELECT COUNT(*) as count FROM templates WHERE is_builtin = 1').get().count
    if (existingCount === 0) {
      const seed = createSeedData()
      const insertT = _sqliteDb.prepare('INSERT INTO templates (id, name, description, category, system_prompt, is_builtin) VALUES (@id, @name, @description, @category, @system_prompt, @is_builtin)')
      const insertD = _sqliteDb.prepare('INSERT INTO focus_dimensions (id, template_id, name, description, prompt, enabled) VALUES (@id, @template_id, @name, @description, @prompt, 1)')
      _sqliteDb.transaction(() => {
        for (const t of seed.templates) insertT.run(t)
        for (const d of seed.dimensions) insertD.run(d)
        for (const u of seed.users) _sqliteDb.prepare('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(u.id, u.email, u.password, u.name, u.role)
      })()
    }
  }
  return _sqliteDb
}

export { MemoryDB, isVercel }
export default getDB
