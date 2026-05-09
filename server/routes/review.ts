import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import getDB from '../db.js'
const db = getDB()
import { callAIReview, isAIConfigured } from '../services/aiReview.js'

const router = Router()

const riskLevels = ['high', 'medium', 'low']
const riskLabels: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

const categoryFindings: Record<string, Array<{
  category: string
  descriptionTemplates: string[]
  suggestionTemplates: string[]
  relatedLaws: string[]
}>> = {
  labor: [
    {
      category: '薪资条款',
      descriptionTemplates: [
        '合同未明确约定薪资构成，仅约定总金额，可能导致加班费计算基数争议',
        '试用期薪资约定低于同岗位最低工资或劳动合同约定工资的百分之八十',
        '薪资支付周期超过法定一个月，违反《工资支付暂行规定》',
        '绩效工资占比过高且考核标准不明确，存在变相克扣工资风险',
        '未约定薪资调整机制，劳动者薪资增长缺乏保障',
      ],
      suggestionTemplates: [
        '建议明确约定薪资构成，包括基本工资、岗位工资、绩效工资等各项金额及占比',
        '建议将试用期薪资调整为不低于转正工资的百分之八十，且不低于当地最低工资标准',
        '建议将薪资支付周期调整为每月至少支付一次，并明确支付日期',
        '建议明确绩效考核标准和发放条件，确保绩效工资计算方式透明可预期',
        '建议增加薪资调整条款，约定薪资调整的条件、幅度和程序',
      ],
      relatedLaws: ['《劳动合同法》第十八条', '《劳动合同法》第二十条', '《工资支付暂行规定》第七条', '《劳动合同法》第三十条'],
    },
    {
      category: '工时约定',
      descriptionTemplates: [
        '合同约定工作时间超过法定标准，每日超过8小时或每周超过40小时',
        '未约定加班审批程序，可能导致所有额外工作时间被认定为加班',
        '休息日安排工作未约定补休或加班费支付方式',
        '综合计算工时制未经劳动行政部门审批即写入合同',
        '未明确约定年休假安排，可能导致劳动者休假权无法保障',
      ],
      suggestionTemplates: [
        '建议将工作时间调整为符合法定标准，如需延长应依法支付加班费',
        '建议增加加班审批流程条款，明确加班需经书面确认',
        '建议明确休息日工作安排的补偿方式，补休或支付百分之二百工资',
        '建议在约定综合计算工时制前先取得劳动行政部门审批',
        '建议增加年休假条款，明确休假安排和未休假补偿方式',
      ],
      relatedLaws: ['《劳动法》第三十六条', '《劳动法》第四十四条', '《职工带薪年休假条例》第三条', '《劳动法》第三十九条'],
    },
    {
      category: '解除条件',
      descriptionTemplates: [
        '用人单位单方解除条件过于宽泛，超出法定范围',
        '约定劳动者辞职需提前超过三十日通知，违反法律规定',
        '经济补偿金计算标准低于法定标准，损害劳动者权益',
        '存在违法约定违约金的条款，限制劳动者择业自由',
        '未约定用人单位违法解除的赔偿责任',
      ],
      suggestionTemplates: [
        '建议将用人单位单方解除条件限定在《劳动合同法》第三十九条、第四十条范围内',
        '建议将劳动者辞职通知期调整为提前三十日（试用期内提前三日）',
        '建议按《劳动合同法》第四十七条规定计算经济补偿金',
        '建议删除违法违约金条款，仅保留竞业限制和服务期两种法定违约金情形',
        '建议增加用人单位违法解除劳动合同的赔偿条款，按经济补偿标准的二倍支付',
      ],
      relatedLaws: ['《劳动合同法》第三十九条', '《劳动合同法》第三十七条', '《劳动合同法》第四十七条', '《劳动合同法》第二十五条', '《劳动合同法》第四十八条'],
    },
    {
      category: '竞业限制',
      descriptionTemplates: [
        '竞业限制适用人员范围过宽，超出法定范围',
        '竞业限制期限超过两年，违反法律规定',
        '竞业限制补偿金标准过低，低于法定最低标准',
        '竞业限制范围过于宽泛，不当限制劳动者就业权',
        '未约定用人单位解除竞业限制的权利和程序',
      ],
      suggestionTemplates: [
        '建议将竞业限制人员限定为高级管理人员、高级技术人员和其他负有保密义务的人员',
        '建议将竞业限制期限调整为不超过两年',
        '建议将竞业限制补偿金调整为不低于离职前十二个月平均工资的百分之三十',
        '建议明确竞业限制的行业范围和地域范围，避免过于宽泛',
        '建议增加用人单位解除竞业限制的条款，明确通知方式和效力',
      ],
      relatedLaws: ['《劳动合同法》第二十四条', '《劳动合同法》第二十四条', '《最高人民法院关于审理劳动争议案件适用法律问题的解释（四）》第六条', '《劳动合同法》第二十四条'],
    },
    {
      category: '社保缴纳',
      descriptionTemplates: [
        '合同约定以现金补贴替代社保缴纳，违反法律强制性规定',
        '未明确约定五险缴纳义务，可能存在漏缴风险',
        '社保缴费基数约定低于实际工资，违反法律规定',
        '未约定住房公积金缴纳事项',
        '约定劳动者自愿放弃社保，该条款无效',
      ],
      suggestionTemplates: [
        '建议删除以现金补贴替代社保的条款，依法缴纳社会保险',
        '建议明确约定依法缴纳养老保险、医疗保险、失业保险、工伤保险和生育保险',
        '建议约定按劳动者实际工资作为社保缴费基数',
        '建议增加住房公积金缴纳条款，明确缴纳比例和基数',
        '建议删除劳动者自愿放弃社保的条款，该约定因违反法律强制性规定而无效',
      ],
      relatedLaws: ['《社会保险法》第五十八条', '《社会保险法》第六十条', '《住房公积金管理条例》第十五条', '《社会保险法》第六十条'],
    },
  ],
  lease: [
    {
      category: '租金条款',
      descriptionTemplates: [
        '租金调整机制不公平，出租方单方面随意调价',
        '未约定租金支付具体日期，可能导致支付争议',
        '存在隐性收费条款，如物业管理费、公摊费用未在合同中明确',
        '免租期约定不明确，起止时间和条件模糊',
        '租金包含项目不明确，可能产生额外费用争议',
      ],
      suggestionTemplates: [
        '建议增加租金调整的触发条件和幅度上限，约定调价需双方协商一致',
        '建议明确约定每月支付日期，如每月第几个工作日前支付',
        '建议将所有费用项目列明，区分租金、物业费、水电费等各项金额',
        '建议明确免租期的起止日期、适用条件和不可抗力影响处理',
        '建议明确租金包含的项目和不包含的项目，避免歧义',
      ],
      relatedLaws: ['《民法典》第七百零三条', '《民法典》第七百二十二条', '《民法典》第五百一十条', '《民法典》第七百零四条'],
    },
    {
      category: '维修责任',
      descriptionTemplates: [
        '出租方维修义务范围不明确，可能导致推诿责任',
        '承租方日常维护责任范围过宽，不合理地加重承租方负担',
        '未约定维修响应时间，影响承租方正常使用',
        '维修费用承担约定不明，大修和小修未区分',
        '因维修影响使用时未约定租金减免',
      ],
      suggestionTemplates: [
        '建议明确出租方维修义务范围，包括主体结构、屋面、管道等',
        '建议合理划分承租方日常维护范围，限定为日常保洁和小型耗材更换',
        '建议约定维修响应时间，如紧急维修24小时内响应',
        '建议区分大修和小修的费用承担方式，大修由出租方承担',
        '建议增加因维修影响使用时的租金减免条款',
      ],
      relatedLaws: ['《民法典》第七百一十二条', '《民法典》第七百一十三条', '《民法典》第七百一十二条', '《民法典》第七百一十三条'],
    },
    {
      category: '违约条款',
      descriptionTemplates: [
        '违约金标准过高，超过实际损失的百分之三十',
        '单方解除权不对等，仅赋予出租方解除权',
        '逾期支付租金的滞纳金计算标准过高',
        '存在显失公平的违约条款，如轻微违约即解除合同',
        '未约定不可抗力条款，风险分配不合理',
      ],
      suggestionTemplates: [
        '建议将违约金调整为合理范围，不超过实际损失的百分之三十',
        '建议确保双方解除权对等，明确各自的解除条件和程序',
        '建议将滞纳金调整为合理标准，如每日万分之五',
        '建议区分根本违约和一般违约，分别约定不同的法律后果',
        '建议增加不可抗力条款，明确不可抗力情形和双方权利义务',
      ],
      relatedLaws: ['《民法典》第五百八十五条', '《民法典》第五百六十三条', '《民法典》第五百八十五条', '《民法典》第五百六十三条', '《民法典》第五百九十条'],
    },
    {
      category: '续租条件',
      descriptionTemplates: [
        '承租方无优先续租权，可能面临到期被迫搬迁',
        '续租通知期限过短，不利于承租方安排',
        '续租租金确定方式不公平，出租方单方定价',
        '出租方拒绝续租的条件不明确',
        '未约定续租的程序和期限',
      ],
      suggestionTemplates: [
        '建议增加承租方优先续租权条款，同等条件下优先续租',
        '建议将续租通知期限调整为到期前不少于两个月',
        '建议约定续租租金的确定方式，如参考市场价或约定涨幅上限',
        '建议明确出租方拒绝续租的合理条件',
        '建议明确续租的协商期限和签订新合同的程序',
      ],
      relatedLaws: ['《民法典》第七百三十四条', '《民法典》第七百三十四条', '《民法典》第五百一十条', '《民法典》第七百三十四条'],
    },
    {
      category: '押金退还',
      descriptionTemplates: [
        '押金金额过高，超过三个月租金',
        '押金扣除情形不明确，可能产生争议',
        '退还时间未约定，承租方难以及时收回押金',
        '存在不合理扣款条款，如正常损耗也需赔偿',
        '押金利息归属未约定',
      ],
      suggestionTemplates: [
        '建议将押金金额调整为不超过两个月租金',
        '建议明确列举押金扣除的情形，如拖欠租金、损坏房屋等',
        '建议约定合同终止后十五个工作日内退还押金',
        '建议增加正常损耗免责条款，区分自然老化和人为损坏',
        '建议约定押金利息归承租方所有',
      ],
      relatedLaws: ['《民法典》第五百八十六条', '《民法典》第五百八十七条', '《民法典》第五百八十七条', '《民法典》第五百八十六条'],
    },
  ],
  procurement: [
    {
      category: '价格条款',
      descriptionTemplates: [
        '价格构成不明确，未注明是否含税含运费',
        '调价机制不合理，供应商单方面调价权过大',
        '税费承担约定不清，可能导致额外税费争议',
        '存在价格歧视条款，与市场公允价格偏差过大',
        '未约定价格保护条款，市场价格下降时采购方利益受损',
      ],
      suggestionTemplates: [
        '建议明确价格构成，注明是否含增值税、运费、保险费等',
        '建议增加调价触发条件和双方协商机制，限制单方调价权',
        '建议明确约定税费承担方式，如含税价应注明税率',
        '建议增加价格公允性条款，约定偏离市场价格的处理方式',
        '建议增加价格保护条款，约定市场价格下降时的调价机制',
      ],
      relatedLaws: ['《民法典》第五百零九条', '《民法典》第五百一十条', '《增值税暂行条例》', '《民法典》第五百一十条'],
    },
    {
      category: '交付条件',
      descriptionTemplates: [
        '交付时间约定模糊，使用"尽快"等不确定表述',
        '交付地点未明确约定，风险转移时点不清',
        '验收标准和程序缺失，可能导致质量争议',
        '部分交付的处理方式未约定',
        '迟延交付的违约责任过轻，缺乏约束力',
      ],
      suggestionTemplates: [
        '建议明确约定交付的具体日期或期限',
        '建议明确交付地点，并约定风险自交付时转移',
        '建议增加详细的验收条款，包括验收标准、程序和异议期',
        '建议约定部分交付时采购方有权拒绝接收或要求补齐',
        '建议增加迟延交付的违约金条款，按日计算',
      ],
      relatedLaws: ['《民法典》第六百零一条', '《民法典》第六百零四条', '《民法典》第六百二十条', '《民法典》第六百零一条', '《民法典》第五百七十七条'],
    },
    {
      category: '质量标准',
      descriptionTemplates: [
        '质量标准引用不明确，未注明具体国标或行标编号',
        '检验期过短，采购方无法充分检验',
        '质保期和质保金未约定，售后保障不足',
        '质量异议提出方式和期限不明确',
        '不合格品的处理方式未约定，退货换货条件不清',
      ],
      suggestionTemplates: [
        '建议明确引用具体的国家标准或行业标准编号和版本',
        '建议将检验期调整为合理期限，复杂设备不少于三十日',
        '建议约定质保期（不少于一至两年）和质保金（合同金额的百分之五至十）',
        '建议明确质量异议的提出方式（书面通知）和期限',
        '建议约定不合格品的处理方式，包括退货、换货、降价等选择权',
      ],
      relatedLaws: ['《民法典》第六百一十五条', '《民法典》第六百二十一条', '《民法典》第六百二十二条', '《民法典》第六百二十一条', '《民法典》第六百一十七条'],
    },
    {
      category: '违约责任',
      descriptionTemplates: [
        '违约情形列举不全，部分违约行为无对应责任',
        '违约金计算方式不合理，与实际损失不匹配',
        '损害赔偿范围不明确，是否包含间接损失未约定',
        '免责条款过于宽泛，供应商容易逃避责任',
        '违约责任不对等，采购方违约责任重于供应方',
      ],
      suggestionTemplates: [
        '建议全面列举违约情形，包括迟延交付、质量不合格、知识产权侵权等',
        '建议将违约金调整为合理比例，如合同金额的百分之五至二十',
        '建议明确损害赔偿范围，约定是否包含间接损失及计算方式',
        '建议缩小免责条款范围，仅限于不可抗力等法定免责事由',
        '建议确保双方违约责任对等，避免权利义务失衡',
      ],
      relatedLaws: ['《民法典》第五百七十七条', '《民法典》第五百八十五条', '《民法典》第五百八十四条', '《民法典》第五百九十条', '《民法典》第五百八十五条'],
    },
    {
      category: '付款条件',
      descriptionTemplates: [
        '付款方式不安全，全额预付款风险过大',
        '付款节点与交付进度不匹配，先付款后交付',
        '付款期限约定不明，可能产生争议',
        '发票开具时间和类型未约定，影响税务抵扣',
        '预付款比例过高，采购方资金风险大',
      ],
      suggestionTemplates: [
        '建议采用分期付款方式，按交付进度支付',
        '建议调整付款节点，确保先验收后付款',
        '建议明确约定付款期限，如验收合格后十五个工作日内',
        '建议约定发票开具时间和类型（增值税专用发票）',
        '建议将预付款比例控制在合同金额的百分之三十以内',
      ],
      relatedLaws: ['《民法典》第六百二十六条', '《民法典》第六百二十八条', '《民法典》第六百二十六条', '《增值税暂行条例》', '《民法典》第六百二十六条'],
    },
  ],
  service: [
    {
      category: '服务范围',
      descriptionTemplates: [
        '服务内容描述过于笼统，缺乏具体交付物清单',
        '服务范围变更的审批流程缺失，可能导致范围蔓延',
        '不在服务范围内的工作未约定处理方式',
        '服务人员资质要求未明确，服务质量无保障',
        '交付物验收标准不清晰，可能导致交付争议',
      ],
      suggestionTemplates: [
        '建议详细列举服务内容和交付物清单，明确各项服务的具体要求',
        '建议增加服务范围变更的书面审批流程和费用调整机制',
        '建议明确约定不在服务范围内工作的处理方式和计费标准',
        '建议约定服务人员的最低资质要求和人员变更的审批程序',
        '建议制定详细的验收标准和验收程序，包括验收文档清单',
      ],
      relatedLaws: ['《民法典》第五百零九条', '《民法典》第五百一十条', '《民法典》第五百一十条', '《民法典》第五百零九条', '《民法典》第五百零九条'],
    },
    {
      category: 'SLA标准',
      descriptionTemplates: [
        '服务可用性指标未约定，服务质量无法衡量',
        '响应时间和解决时间标准缺失，问题处理无时效保障',
        'SLA违约的赔偿机制无效，缺乏实质约束力',
        '服务监控和报告机制未约定，委托方无法掌握服务状况',
        'SLA豁免情形过于宽泛，服务方可轻易规避责任',
      ],
      suggestionTemplates: [
        '建议约定明确的服务可用性指标，如月度可用率不低于99.9%',
        '建议分级别约定响应时间和解决时间，如紧急问题2小时响应',
        '建议增加SLA违约赔偿条款，如按未达标时间比例退还服务费',
        '建议约定定期服务报告制度，包括月度服务报告和季度评审',
        '建议缩小SLA豁免范围，仅限于不可抗力和委托方原因',
      ],
      relatedLaws: ['《民法典》第五百零九条', '《民法典》第五百七十七条', '《民法典》第五百八十五条', '《民法典》第五百零九条', '《民法典》第五百九十条'],
    },
    {
      category: '费用条款',
      descriptionTemplates: [
        '费用构成不透明，存在隐性费用风险',
        '付款方式和时间节点不合理，先付全款后服务',
        '费用调整条件和程序未约定，单方涨价无约束',
        '额外费用的审批流程缺失，费用不可控',
        '退款机制未约定，服务不达标时委托方权益无保障',
      ],
      suggestionTemplates: [
        '建议详细列明费用构成，包括人工费、材料费、差旅费等各项金额',
        '建议采用按阶段付款方式，与服务交付节点对应',
        '建议增加费用调整条款，约定调整条件和双方协商程序',
        '建议约定额外费用需书面确认后方可发生',
        '建议增加退款条款，约定服务不达标时的费用退还机制',
      ],
      relatedLaws: ['《民法典》第五百零九条', '《民法典》第六百二十六条', '《民法典》第五百一十条', '《民法典》第五百一十条', '《民法典》第五百六十六条'],
    },
    {
      category: '知识产权',
      descriptionTemplates: [
        '服务成果知识产权归属不明确，可能产生权属争议',
        '背景知识产权许可范围过宽，委托方商业秘密可能泄露',
        '知识产权侵权担保责任缺失，委托方可能面临侵权风险',
        '开源组件使用未约定，可能影响委托方产品合规性',
        '知识产权转让或独占许可的限制不合理',
      ],
      suggestionTemplates: [
        '建议明确约定服务成果的知识产权归属，通常归委托方所有',
        '建议限定背景知识产权的许可范围，仅限于本项目必要范围',
        '建议增加知识产权侵权担保条款，服务方承担侵权赔偿责任',
        '建议约定开源组件使用需提前告知并取得委托方书面同意',
        '建议合理约定知识产权转让和许可的限制条件',
      ],
      relatedLaws: ['《著作权法》第十九条', '《著作权法》第二十四条', '《专利法》第七十七条', '《开源许可证相关条例》', '《著作权法》第十条'],
    },
    {
      category: '保密条款',
      descriptionTemplates: [
        '保密信息范围界定不清，可能导致保密义务无法执行',
        '保密义务期限未约定，合同终止后保密义务是否延续不明',
        '保密例外情形缺失，服务方在合理情况下无法使用自有知识',
        '保密违约责任过轻，缺乏实质威慑力',
        '信息返还和销毁义务未约定，合同终止后信息可能留存',
      ],
      suggestionTemplates: [
        '建议明确界定保密信息范围，采用定义加列举的方式',
        '建议约定保密义务在合同终止后继续有效，期限不少于三年',
        '建议增加保密例外条款，包括已公开信息、独立开发等情形',
        '建议增加保密违约金条款，约定具体金额或计算方式',
        '建议约定合同终止后信息返还和销毁的时限和确认方式',
      ],
      relatedLaws: ['《反不正当竞争法》第九条', '《民法典》第五百零一条', '《反不正当竞争法》第九条', '《反不正当竞争法》第十七条', '《民法典》第五百六十六条'],
    },
  ],
  nda: [
    {
      category: '保密范围',
      descriptionTemplates: [
        '保密信息定义过于宽泛，可能导致日常商业信息也被纳入保密范围',
        '保密信息标记要求不合理，所有信息都需标记保密才能受保护',
        '口头披露的保密信息确认方式缺失，可能导致争议',
        '未区分不同密级的信息，保护措施缺乏针对性',
        '保密信息范围排除情形不足，接收方合法权利受限',
      ],
      suggestionTemplates: [
        '建议缩小保密信息定义范围，限定为具有商业价值且未公开的信息',
        '建议约定标记要求的同时，增加书面确认的替代方式',
        '建议增加口头披露保密信息的书面确认条款，如三十日内书面确认',
        '建议区分绝密、机密、秘密等不同密级，分别约定保护措施',
        '建议增加保密信息排除情形，如已公开信息、独立开发信息等',
      ],
      relatedLaws: ['《反不正当竞争法》第九条', '《反不正当竞争法》第九条', '《反不正当竞争法》第九条', '《反不正当竞争法》第九条', '《反不正当竞争法》第九条'],
    },
    {
      category: '期限约定',
      descriptionTemplates: [
        '保密期限为无限期，对接收方施加了不合理的长期义务',
        '不同类型信息未区分保密期限，技术信息和商业信息适用相同期限',
        '保密义务在协议终止后是否继续有效未明确约定',
        '保密期限的起算方式不明确',
        '存在不合理的超长保密期限，超过商业秘密合理保护需要',
      ],
      suggestionTemplates: [
        '建议将保密期限设定为合理期限，如三至五年',
        '建议区分技术信息和商业信息，分别约定不同保密期限',
        '建议明确约定协议终止后保密义务继续有效，并约定延续期限',
        '建议明确保密期限自信息披露之日起算',
        '建议将保密期限调整为与信息商业价值相匹配的合理期限',
      ],
      relatedLaws: ['《民法典》第五百一十条', '《反不正当竞争法》第九条', '《民法典》第五百零一条', '《民法典》第五百一十条', '《反不正当竞争法》第九条'],
    },
    {
      category: '违约责任',
      descriptionTemplates: [
        '违约情形列举不全，部分违约行为无对应责任',
        '损害赔偿计算方式不明确，实际损失难以证明',
        '未约定禁令救济等临时措施，泄密后难以阻止继续扩散',
        '违约金过低，缺乏实质威慑力',
        '违约责任不对等，披露方和接收方权利义务失衡',
      ],
      suggestionTemplates: [
        '建议全面列举违约情形，包括未经许可披露、未采取保护措施等',
        '建议约定损害赔偿的计算方式，如按信息评估价值或违约所得计算',
        '建议增加禁令救济条款，约定有权申请行为保全',
        '建议将违约金调整为合理金额，具有实质威慑力',
        '建议确保双方违约责任对等，避免权利义务失衡',
      ],
      relatedLaws: ['《民法典》第五百七十七条', '《民法典》第五百八十四条', '《民事诉讼法》第一百零三条', '《民法典》第五百八十五条', '《民法典》第五百八十五条'],
    },
    {
      category: '例外条款',
      descriptionTemplates: [
        '保密例外情形不全面，接收方合法权利可能受限',
        '独立开发的举证标准过高，接收方难以证明',
        '法律强制披露的处理方式未约定',
        '政府机关要求披露的应对措施缺失',
        '例外条款限制过严，不合理地限制了接收方的正常商业活动',
      ],
      suggestionTemplates: [
        '建议增加保密例外情形，包括已公开信息、独立开发、合法获取等',
        '建议合理设定独立开发的举证标准，如提供开发记录和文档',
        '建议增加法律强制披露条款，约定通知义务和披露范围限制',
        '建议增加政府机关要求披露的应对条款，约定事先通知和最小披露原则',
        '建议适当放宽例外条款限制，保障接收方正常的商业活动',
      ],
      relatedLaws: ['《反不正当竞争法》第九条', '《反不正当竞争法》第九条', '《民法典》第五百零一条', '《民法典》第五百零一条', '《反不正当竞争法》第九条'],
    },
    {
      category: '归还义务',
      descriptionTemplates: [
        '信息归还的时限未约定，可能导致信息长期滞留',
        '销毁方式和确认程序缺失，无法确保信息彻底删除',
        '电子副本的销毁未涵盖，信息可能残留在备份系统中',
        '不允许保留法律合规所需的副本，不合理地增加了合规风险',
        '归还或销毁的书面确认未要求，无法验证义务履行',
      ],
      suggestionTemplates: [
        '建议约定协议终止后三十日内归还或销毁全部保密信息',
        '建议约定销毁方式（如粉碎、格式化）和销毁确认程序',
        '建议增加电子副本销毁条款，包括备份系统中的残留信息',
        '建议允许保留法律合规所需的副本，但约定继续承担保密义务',
        '建议要求书面确认归还或销毁的完成情况',
      ],
      relatedLaws: ['《民法典》第五百六十六条', '《反不正当竞争法》第九条', '《反不正当竞争法》第九条', '《民法典》第五百零一条', '《民法典》第五百六十六条'],
    },
  ],
}

function generateMockFindings(
  contractContent: string,
  templateId: string | null,
  strictness: string,
  dimensions: Array<{ name: string; prompt: string }>
): Array<{
  id: string
  clause_index: number
  original_text: string
  risk_level: string
  category: string
  description: string
  suggestion: string
  related_law: string
}> {
  const findings: Array<{
    id: string
    clause_index: number
    original_text: string
    risk_level: string
    category: string
    description: string
    suggestion: string
    related_law: string
  }> = []

  let categoryKey = 'labor'
  if (templateId) {
    const template = db.prepare('SELECT category FROM templates WHERE id = ?').get(templateId) as { category: string } | undefined
    if (template) {
      categoryKey = template.category
    }
  }

  const availableFindings = categoryFindings[categoryKey] || categoryFindings['labor']

  const riskWeights: Record<string, number[]> = {
    strict: [50, 30, 20],
    medium: [25, 45, 30],
    loose: [10, 30, 60],
  }
  const weights = riskWeights[strictness] || riskWeights['medium']

  const contentLength = contractContent.length
  const findingCount = Math.min(Math.max(Math.floor(contentLength / 200), 3), 8)

  const usedIndices = new Set<number>()

  for (let i = 0; i < findingCount; i++) {
    const dimIndex = i % dimensions.length
    const dim = dimensions[dimIndex]

    let findingGroupIndex: number
    do {
      findingGroupIndex = Math.floor(Math.random() * availableFindings.length)
    } while (usedIndices.has(findingGroupIndex) && usedIndices.size < availableFindings.length)
    usedIndices.add(findingGroupIndex)

    const group = availableFindings[findingGroupIndex]
    const templateIdx = Math.floor(Math.random() * group.descriptionTemplates.length)

    const rand = Math.random() * 100
    let riskLevel: string
    if (rand < weights[0]) {
      riskLevel = 'high'
    } else if (rand < weights[0] + weights[1]) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'low'
    }

    const sentences = contractContent.split(/[。！？；\n]/).filter(s => s.trim().length > 5)
    const clauseIndex = Math.min(Math.floor(Math.random() * sentences.length), sentences.length - 1)
    const originalText = sentences[clauseIndex]?.trim().substring(0, 100) || '合同相关条款'

    findings.push({
      id: uuidv4(),
      clause_index: clauseIndex,
      original_text: originalText,
      risk_level: riskLevel,
      category: group.category,
      description: group.descriptionTemplates[templateIdx],
      suggestion: group.suggestionTemplates[templateIdx],
      related_law: group.relatedLaws[templateIdx],
    })
  }

  return findings
}

function calculateOverallScore(findings: Array<{ risk_level: string }>, strictness: string): number {
  const riskScores: Record<string, number> = { high: 25, medium: 50, low: 75 }
  const strictnessMultiplier: Record<string, number> = { strict: 0.85, medium: 1.0, loose: 1.15 }

  if (findings.length === 0) return 95

  const avgScore = findings.reduce((sum, f) => sum + (riskScores[f.risk_level] || 50), 0) / findings.length
  const multiplier = strictnessMultiplier[strictness] || 1.0
  const score = Math.round(avgScore * multiplier)
  return Math.max(0, Math.min(100, score))
}

function generateSummary(findings: Array<{ risk_level: string; category: string; description: string }>, overallScore: number): string {
  const highCount = findings.filter(f => f.risk_level === 'high').length
  const mediumCount = findings.filter(f => f.risk_level === 'medium').length
  const lowCount = findings.filter(f => f.risk_level === 'low').length

  const categories = [...new Set(findings.map(f => f.category))]

  let summary = `本次审核共发现${findings.length}处风险点，其中高风险${highCount}项、中风险${mediumCount}项、低风险${lowCount}项。`

  if (highCount > 0) {
    const highCategories = findings.filter(f => f.risk_level === 'high').map(f => f.category)
    summary += `重点关注${[...new Set(highCategories)].join('、')}等方面的高风险条款，建议优先修改。`
  }

  if (mediumCount > 0) {
    summary += `中风险条款涉及${categories.filter(c => !findings.some(f => f.risk_level === 'high' && f.category === c)).slice(0, 3).join('、')}等维度，建议审慎评估后修改。`
  }

  if (overallScore >= 80) {
    summary += '整体风险可控，合同基本符合法律要求。'
  } else if (overallScore >= 60) {
    summary += '合同存在一定法律风险，建议修改后再行签署。'
  } else {
    summary += '合同存在较大法律风险，强烈建议全面修改后再行签署。'
  }

  return summary
}

function calculateRiskDistribution(findings: Array<{ risk_level: string }>): string {
  const distribution = { high: 0, medium: 0, low: 0 }
  for (const f of findings) {
    distribution[f.risk_level] = (distribution[f.risk_level] || 0) + 1
  }
  return JSON.stringify(distribution)
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, source, template_id, custom_prompt, strictness = 'medium' } = req.body

    if (!title || !content) {
      res.status(400).json({ success: false, error: '合同标题和内容不能为空' })
      return
    }

    if (!['strict', 'medium', 'loose'].includes(strictness)) {
      res.status(400).json({ success: false, error: '严格程度参数无效，应为 strict/medium/loose' })
      return
    }

    const contractId = uuidv4()
    const reviewId = uuidv4()

    const insertContract = db.prepare(`
      INSERT INTO contracts (id, title, content, source)
      VALUES (?, ?, ?, ?)
    `)
    insertContract.run(contractId, title, content, source || 'paste')

    let dimensions: Array<{ name: string; prompt: string }> = []
    if (template_id) {
      dimensions = db.prepare('SELECT name, prompt FROM focus_dimensions WHERE template_id = ? AND enabled = 1').all(template_id) as Array<{ name: string; prompt: string }>
    }
    if (dimensions.length === 0) {
      dimensions = [
        { name: '合同主体', prompt: '审核合同主体资格和签约能力' },
        { name: '合同标的', prompt: '审核合同标的是否明确合法' },
        { name: '权利义务', prompt: '审核双方权利义务是否对等' },
        { name: '违约责任', prompt: '审核违约责任是否合理' },
        { name: '争议解决', prompt: '审核争议解决条款是否完善' },
      ]
    }

    let findings: any[]
    let overallScore: number
    let summary: string
    let riskDistribution: string

    const templateSystemPrompt = template_id
      ? (db.prepare('SELECT system_prompt FROM templates WHERE id = ?').get(template_id) as { system_prompt: string } | undefined)?.system_prompt || null
      : null

    if (isAIConfigured()) {
      try {
        const aiResult = await callAIReview(
          content,
          templateSystemPrompt,
          dimensions,
          strictness,
          custom_prompt
        )
        findings = aiResult.findings.map((f) => ({
          id: uuidv4(),
          clause_index: f.clauseIndex,
          original_text: f.originalText,
          risk_level: f.riskLevel,
          category: f.category,
          description: f.description,
          suggestion: f.suggestion,
          related_law: f.relatedLaw || null,
        }))
        overallScore = aiResult.overallScore
        summary = aiResult.summary
        riskDistribution = JSON.stringify(aiResult.riskDistribution)
      } catch (aiError) {
        console.error('AI review failed, falling back to mock:', aiError)
        findings = generateMockFindings(content, template_id || null, strictness, dimensions)
        overallScore = calculateOverallScore(findings, strictness)
        summary = generateSummary(findings, overallScore) + '（AI服务暂不可用，以下为模拟审核结果）'
        riskDistribution = calculateRiskDistribution(findings)
      }
    } else {
      findings = generateMockFindings(content, template_id || null, strictness, dimensions)
      overallScore = calculateOverallScore(findings, strictness)
      summary = generateSummary(findings, overallScore)
      riskDistribution = calculateRiskDistribution(findings)
    }

    const insertReview = db.prepare(`
      INSERT INTO reviews (id, contract_id, template_id, custom_prompt, strictness, overall_score, summary, risk_distribution, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `)
    insertReview.run(reviewId, contractId, template_id || null, custom_prompt || null, strictness, overallScore, summary, riskDistribution)

    const insertFinding = db.prepare(`
      INSERT INTO findings (id, review_id, clause_index, original_text, risk_level, category, description, suggestion, related_law)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const finding of findings) {
      insertFinding.run(finding.id, reviewId, finding.clause_index, finding.original_text, finding.risk_level, finding.category, finding.description, finding.suggestion, finding.related_law)
    }

    const review = db.prepare(`
      SELECT r.*, c.title as contract_title, c.content as contract_content, c.source as contract_source, c.created_at as contract_created_at,
        t.name as template_name
      FROM reviews r
      LEFT JOIN contracts c ON r.contract_id = c.id
      LEFT JOIN templates t ON r.template_id = t.id
      WHERE r.id = ?
    `).get(reviewId) as any

    res.status(201).json({
      success: true,
      data: {
        ...review,
        findings,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '审核提交失败' })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size as string) || 10))
    const sortBy = (req.query.sort_by as string) === 'score' ? 'overall_score' : 'created_at'
    const sortOrder = (req.query.sort_order as string) === 'asc' ? 'ASC' : 'DESC'
    const status = req.query.status as string

    const offset = (page - 1) * pageSize

    let countQuery = 'SELECT COUNT(*) as total FROM reviews'
    let listQuery = `
      SELECT r.id, r.contract_id, r.template_id, r.strictness, r.overall_score, r.summary, r.risk_distribution, r.status, r.created_at,
        c.title as contract_title, c.source as contract_source,
        t.name as template_name
      FROM reviews r
      LEFT JOIN contracts c ON r.contract_id = c.id
      LEFT JOIN templates t ON r.template_id = t.id
    `

    const params: unknown[] = []
    if (status) {
      countQuery += ' WHERE status = ?'
      listQuery += ' WHERE r.status = ?'
      params.push(status)
    }

    listQuery += ` ORDER BY r.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`

    const total = (db.prepare(countQuery).get(...params) as { total: number }).total
    const reviews = db.prepare(listQuery).all(...params, pageSize, offset)

    res.json({
      success: true,
      data: {
        items: reviews,
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取审核列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const review = db.prepare(`
      SELECT r.*, c.title as contract_title, c.content as contract_content, c.source as contract_source, c.created_at as contract_created_at,
        t.name as template_name
      FROM reviews r
      LEFT JOIN contracts c ON r.contract_id = c.id
      LEFT JOIN templates t ON r.template_id = t.id
      WHERE r.id = ?
    `).get(req.params.id) as any

    if (!review) {
      res.status(404).json({ success: false, error: '审核记录不存在' })
      return
    }

    const findings = db.prepare('SELECT * FROM findings WHERE review_id = ? ORDER BY clause_index').all(req.params.id)

    res.json({
      success: true,
      data: {
        ...review,
        findings,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取审核详情失败' })
  }
})

export default router
