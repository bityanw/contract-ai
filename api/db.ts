import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import bcryptjs from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'contract_review.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'paste',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    is_builtin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS focus_dimensions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    template_id TEXT,
    custom_prompt TEXT,
    strictness TEXT DEFAULT 'medium',
    overall_score INTEGER,
    summary TEXT,
    risk_distribution TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (template_id) REFERENCES templates(id)
  );

  CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    clause_index INTEGER,
    original_text TEXT,
    risk_level TEXT NOT NULL,
    category TEXT,
    description TEXT,
    suggestion TEXT,
    related_law TEXT,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_contract ON reviews(contract_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
  CREATE INDEX IF NOT EXISTS idx_findings_review ON findings(review_id);
  CREATE INDEX IF NOT EXISTS idx_findings_risk ON findings(risk_level);
  CREATE INDEX IF NOT EXISTS idx_dimensions_template ON focus_dimensions(template_id);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`)

const seedTemplates = [
  {
    id: uuidv4(),
    name: '劳动合同审核模板',
    description: '适用于劳动合同的全面法律审核，涵盖薪资、工时、解除条件、竞业限制及社保等核心条款',
    category: 'labor',
    system_prompt: '你是一名专业的劳动法律师，擅长审核劳动合同。请根据《中华人民共和国劳动法》《中华人民共和国劳动合同法》及相关法规，对劳动合同进行全面审核。重点关注薪资条款、工时约定、解除条件、竞业限制、社保缴纳等方面，识别可能损害劳动者或用人单位合法权益的条款，并提供专业修改建议。审核结果需包含风险等级、具体问题描述和法律依据。',
    is_builtin: 1,
    dimensions: [
      {
        id: uuidv4(),
        name: '薪资条款',
        description: '审核薪资构成、支付方式、加班费计算等条款',
        prompt: '请重点审核合同中关于薪资的条款，包括：1)薪资构成是否明确（基本工资、绩效、津贴等）；2)薪资支付周期和方式是否符合法律规定；3)加班费计算基数是否合理；4)是否存在克扣工资的条款；5)薪资调整机制是否公平。请依据《劳动合同法》第十八条、第二十条、第三十条等规定进行审核。',
      },
      {
        id: uuidv4(),
        name: '工时约定',
        description: '审核工作时间、休息休假、加班安排等条款',
        prompt: '请重点审核合同中关于工时的条款，包括：1)工作时间是否符合法定标准（每日不超过8小时，每周不超过40小时）；2)休息日和法定节假日安排是否合法；3)加班时长是否超过法定上限（每月不超过36小时）；4)是否存在强制加班条款；5)年休假安排是否合规。请依据《劳动法》第三十六条至第四十五条进行审核。',
      },
      {
        id: uuidv4(),
        name: '解除条件',
        description: '审核合同解除、终止条件及经济补偿条款',
        prompt: '请重点审核合同中关于解除条件的条款，包括：1)用人单位单方解除条件是否超出法定范围；2)劳动者单方解除权是否受到不当限制；3)经济补偿金计算标准是否合法；4)代通知金条款是否合理；5)是否存在违法约定违约金的条款。请依据《劳动合同法》第三十六条至第五十条进行审核。',
      },
      {
        id: uuidv4(),
        name: '竞业限制',
        description: '审核竞业限制范围、期限、补偿等条款',
        prompt: '请重点审核合同中关于竞业限制的条款，包括：1)竞业限制适用人员范围是否合理（仅限高级管理人员、高级技术人员和其他负有保密义务的人员）；2)竞业限制期限是否超过两年；3)竞业限制补偿金是否不低于法定标准；4)竞业限制范围是否过宽影响劳动者就业权；5)违约金是否过高。请依据《劳动合同法》第二十三条、第二十四条进行审核。',
      },
      {
        id: uuidv4(),
        name: '社保缴纳',
        description: '审核社会保险和住房公积金缴纳条款',
        prompt: '请重点审核合同中关于社保缴纳的条款，包括：1)是否明确约定依法缴纳社会保险；2)是否存在以现金补贴替代社保缴纳的违法条款；3)五险（养老、医疗、失业、工伤、生育）是否齐全；4)住房公积金缴纳是否约定；5)缴费基数是否合规。请依据《社会保险法》及《住房公积金管理条例》进行审核。',
      },
    ],
  },
  {
    id: uuidv4(),
    name: '租赁合同审核模板',
    description: '适用于房屋及场地租赁合同的全面法律审核，涵盖租金、维修责任、违约条款、续租条件及押金退还等核心条款',
    category: 'lease',
    system_prompt: '你是一名专业的房地产法律师，擅长审核租赁合同。请根据《中华人民共和国民法典》合同编及相关法规，对租赁合同进行全面审核。重点关注租金条款、维修责任、违约条款、续租条件、押金退还等方面，识别可能损害出租方或承租方合法权益的条款，并提供专业修改建议。审核结果需包含风险等级、具体问题描述和法律依据。',
    is_builtin: 1,
    dimensions: [
      {
        id: uuidv4(),
        name: '租金条款',
        description: '审核租金标准、支付方式、调整机制等条款',
        prompt: '请重点审核合同中关于租金的条款，包括：1)租金标准是否明确合理；2)支付方式和周期是否约定清楚；3)租金调整机制是否公平（调整幅度、频率、通知方式）；4)是否存在隐性收费条款；5)免租期约定是否合理。请依据《民法典》第七百零三条至第七百三十四条进行审核。',
      },
      {
        id: uuidv4(),
        name: '维修责任',
        description: '审核租赁物维修、保养责任划分条款',
        prompt: '请重点审核合同中关于维修责任的条款，包括：1)出租方维修义务是否明确（主体结构、设施设备等）；2)承租方日常维护责任范围是否合理；3)维修响应时间是否约定；4)维修费用承担是否明确；5)因维修影响使用时租金减免是否约定。请依据《民法典》第七百一十二条、第七百一十三条进行审核。',
      },
      {
        id: uuidv4(),
        name: '违约条款',
        description: '审核违约情形、违约金、解除权等条款',
        prompt: '请重点审核合同中关于违约的条款，包括：1)违约情形列举是否全面合理；2)违约金标准是否过高或过低；3)单方解除权是否对等；4)逾期支付租金的滞纳金是否合理；5)是否存在显失公平的违约条款。请依据《民法典》第五百七十七条至第五百八十五条进行审核。',
      },
      {
        id: uuidv4(),
        name: '续租条件',
        description: '审核续租优先权、续租程序、租金调整等条款',
        prompt: '请重点审核合同中关于续租的条款，包括：1)承租方是否享有优先续租权；2)续租通知期限是否合理；3)续租租金确定方式是否公平；4)出租方拒绝续租的条件是否明确；5)续租程序是否约定清楚。请依据《民法典》第七百三十四条进行审核。',
      },
      {
        id: uuidv4(),
        name: '押金退还',
        description: '审核押金金额、扣除条件、退还程序等条款',
        prompt: '请重点审核合同中关于押金退还的条款，包括：1)押金金额是否合理（一般不超过三个月租金）；2)押金扣除情形是否明确列举；3)退还时间和方式是否约定；4)是否存在不合理扣款条款；5)押金利息归属是否约定。请依据《民法典》相关规定进行审核。',
      },
    ],
  },
  {
    id: uuidv4(),
    name: '采购合同审核模板',
    description: '适用于物资及设备采购合同的全面法律审核，涵盖价格条款、交付条件、质量标准、违约责任及付款条件等核心条款',
    category: 'procurement',
    system_prompt: '你是一名专业的商事法律师，擅长审核采购合同。请根据《中华人民共和国民法典》合同编及相关法规，对采购合同进行全面审核。重点关注价格条款、交付条件、质量标准、违约责任、付款条件等方面，识别可能损害采购方或供应方合法权益的条款，并提供专业修改建议。审核结果需包含风险等级、具体问题描述和法律依据。',
    is_builtin: 1,
    dimensions: [
      {
        id: uuidv4(),
        name: '价格条款',
        description: '审核价格构成、调价机制、税费承担等条款',
        prompt: '请重点审核合同中关于价格的条款，包括：1)价格构成是否明确（是否含税、含运费等）；2)价格是否为固定价或可调价；3)调价触发条件和程序是否合理；4)税费承担是否约定清楚；5)是否存在价格歧视或不合理定价条款。请依据《民法典》第五百零九条、第五百一十条进行审核。',
      },
      {
        id: uuidv4(),
        name: '交付条件',
        description: '审核交付时间、地点、方式、验收等条款',
        prompt: '请重点审核合同中关于交付的条款，包括：1)交付时间是否明确（具体日期或合理期限）；2)交付地点和方式是否约定；3)风险转移时点是否清楚；4)验收标准和程序是否明确；5)部分交付和分批交付的处理方式。请依据《民法典》第六百零一条至第六百零八条进行审核。',
      },
      {
        id: uuidv4(),
        name: '质量标准',
        description: '审核质量要求、检验期、质保期等条款',
        prompt: '请重点审核合同中关于质量标准的条款，包括：1)质量标准是否明确引用国家标准、行业标准或双方约定标准；2)检验期是否合理；3)质保期和质保金是否约定；4)质量异议提出方式和期限是否明确；5)不合格品的处理方式是否约定。请依据《民法典》第六百一十五条至第六百二十一条进行审核。',
      },
      {
        id: uuidv4(),
        name: '违约责任',
        description: '审核违约情形、违约金、损害赔偿等条款',
        prompt: '请重点审核合同中关于违约责任的条款，包括：1)违约情形是否全面列举；2)违约金计算方式是否合理；3)损害赔偿范围是否明确（是否包含间接损失）；4)免责条款是否合法有效；5)是否存在不对等的违约责任条款。请依据《民法典》第五百七十七条至第五百九十二条进行审核。',
      },
      {
        id: uuidv4(),
        name: '付款条件',
        description: '审核付款方式、付款期限、发票要求等条款',
        prompt: '请重点审核合同中关于付款的条款，包括：1)付款方式是否安全可靠；2)付款节点是否与交付进度匹配；3)付款期限是否合理；4)发票开具时间和类型是否约定；5)是否存在预付款风险条款。请依据《民法典》第六百二十六条至第六百二十九条进行审核。',
      },
    ],
  },
  {
    id: uuidv4(),
    name: '服务合同审核模板',
    description: '适用于专业服务合同的全面法律审核，涵盖服务范围、SLA标准、费用条款、知识产权及保密条款等核心条款',
    category: 'service',
    system_prompt: '你是一名专业的商事法律师，擅长审核服务合同。请根据《中华人民共和国民法典》合同编及相关法规，对服务合同进行全面审核。重点关注服务范围、SLA标准、费用条款、知识产权、保密条款等方面，识别可能损害委托方或服务方合法权益的条款，并提供专业修改建议。审核结果需包含风险等级、具体问题描述和法律依据。',
    is_builtin: 1,
    dimensions: [
      {
        id: uuidv4(),
        name: '服务范围',
        description: '审核服务内容、交付物、变更机制等条款',
        prompt: '请重点审核合同中关于服务范围的条款，包括：1)服务内容描述是否具体明确；2)交付物和验收标准是否清晰；3)服务范围变更的审批流程是否约定；4)不在服务范围内的工作如何处理；5)服务人员资质要求是否明确。请依据《民法典》第五百零九条、第五百一十条进行审核。',
      },
      {
        id: uuidv4(),
        name: 'SLA标准',
        description: '审核服务等级协议、响应时间、可用性等条款',
        prompt: '请重点审核合同中关于SLA的条款，包括：1)服务可用性指标是否明确（如99.9%）；2)响应时间和解决时间是否合理；3)SLA违约的赔偿机制是否有效；4)服务监控和报告机制是否约定；5)SLA豁免情形是否合理。请依据《民法典》相关规定进行审核。',
      },
      {
        id: uuidv4(),
        name: '费用条款',
        description: '审核费用构成、支付方式、调整机制等条款',
        prompt: '请重点审核合同中关于费用的条款，包括：1)费用构成是否明确（固定费用、工时费、材料费等）；2)付款方式和时间节点是否合理；3)费用调整条件和程序是否约定；4)额外费用的审批流程是否明确；5)是否存在隐性费用条款。请依据《民法典》相关规定进行审核。',
      },
      {
        id: uuidv4(),
        name: '知识产权',
        description: '审核知识产权归属、许可、侵权等条款',
        prompt: '请重点审核合同中关于知识产权的条款，包括：1)服务成果的知识产权归属是否明确；2)背景知识产权的许可范围是否合理；3)知识产权侵权担保责任是否约定；4)开源组件使用是否合规；5)知识产权转让或独占许可的限制是否合理。请依据《著作权法》《专利法》及《民法典》相关规定进行审核。',
      },
      {
        id: uuidv4(),
        name: '保密条款',
        description: '审核保密范围、期限、违约责任等条款',
        prompt: '请重点审核合同中关于保密的条款，包括：1)保密信息范围是否明确界定；2)保密义务期限是否合理（合同终止后是否继续有效）；3)保密例外情形是否约定；4)保密违约责任是否明确；5)信息返还和销毁义务是否约定。请依据《反不正当竞争法》第九条及《民法典》相关规定进行审核。',
      },
    ],
  },
  {
    id: uuidv4(),
    name: '保密协议审核模板',
    description: '适用于保密协议（NDA）的全面法律审核，涵盖保密范围、期限约定、违约责任、例外条款及归还义务等核心条款',
    category: 'nda',
    system_prompt: '你是一名专业的知识产权法律师，擅长审核保密协议。请根据《中华人民共和国反不正当竞争法》《中华人民共和国民法典》及相关法规，对保密协议进行全面审核。重点关注保密范围、期限约定、违约责任、例外条款、归还义务等方面，识别可能损害披露方或接收方合法权益的条款，并提供专业修改建议。审核结果需包含风险等级、具体问题描述和法律依据。',
    is_builtin: 1,
    dimensions: [
      {
        id: uuidv4(),
        name: '保密范围',
        description: '审核保密信息定义、范围界定、标记要求等条款',
        prompt: '请重点审核协议中关于保密范围的条款，包括：1)保密信息的定义是否明确具体；2)保密范围是否过宽或过窄；3)保密信息的标记要求是否合理；4)口头披露的保密信息如何确认；5)是否区分了不同密级的信息。请依据《反不正当竞争法》第九条进行审核。',
      },
      {
        id: uuidv4(),
        name: '期限约定',
        description: '审核保密期限、持续义务、终止条件等条款',
        prompt: '请重点审核协议中关于期限的条款，包括：1)保密期限是否合理（是否无限期）；2)不同类型信息的保密期限是否区分；3)保密义务是否在协议终止后继续有效；4)保密期限的起算方式是否明确；5)是否存在不合理的超长保密期限。请依据《民法典》相关规定进行审核。',
      },
      {
        id: uuidv4(),
        name: '违约责任',
        description: '审核违约情形、损害赔偿、救济措施等条款',
        prompt: '请重点审核协议中关于违约责任的条款，包括：1)违约情形是否明确列举；2)损害赔偿计算方式是否合理；3)是否约定禁令救济等临时措施；4)违约金是否过高或过低；5)是否存在不对等的违约责任条款。请依据《民法典》第五百七十七条至第五百八十五条进行审核。',
      },
      {
        id: uuidv4(),
        name: '例外条款',
        description: '审核保密例外情形、独立开发、合法获取等条款',
        prompt: '请重点审核协议中关于例外的条款，包括：1)保密例外情形是否全面（已公开信息、独立开发、合法获取等）；2)独立开发的举证标准是否合理；3)法律强制披露的处理方式是否约定；4)政府机关要求披露的应对措施是否明确；5)是否存在不合理的例外限制。请依据《反不正当竞争法》及相关司法解释进行审核。',
      },
      {
        id: uuidv4(),
        name: '归还义务',
        description: '审核信息归还、销毁、确认等条款',
        prompt: '请重点审核协议中关于归还义务的条款，包括：1)协议终止后信息归还的时限是否明确；2)销毁方式和确认程序是否约定；3)电子副本的销毁是否涵盖；4)是否允许保留法律合规所需的副本；5)归还或销毁的书面确认是否要求。请依据《民法典》相关规定进行审核。',
      },
    ],
  },
]

const insertTemplate = db.prepare(`
  INSERT INTO templates (id, name, description, category, system_prompt, is_builtin)
  VALUES (@id, @name, @description, @category, @system_prompt, @is_builtin)
`)

const insertDimension = db.prepare(`
  INSERT INTO focus_dimensions (id, template_id, name, description, prompt, enabled)
  VALUES (@id, @template_id, @name, @description, @prompt, 1)
`)

const seedData = db.transaction(() => {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM templates WHERE is_builtin = 1').get() as { count: number }
  if (existingCount.count > 0) return

  for (const template of seedTemplates) {
    insertTemplate.run({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      system_prompt: template.system_prompt,
      is_builtin: template.is_builtin,
    })

    for (const dim of template.dimensions) {
      insertDimension.run({
        id: dim.id,
        template_id: template.id,
        name: dim.name,
        description: dim.description,
        prompt: dim.prompt,
      })
    }
  }
})

seedData()

const seedAdmin = db.transaction(() => {
  const existingAdmin = db.prepare("SELECT COUNT(*) as count FROM users WHERE email = 'admin@contractai.com'").get() as { count: number }
  if (existingAdmin.count > 0) return

  const hashedPassword = bcryptjs.hashSync('admin123', 10)
  db.prepare('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(),
    'admin@contractai.com',
    hashedPassword,
    '系统管理员',
    'admin'
  )
})

seedAdmin()

export default db
