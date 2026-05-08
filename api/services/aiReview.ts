interface AIReviewFinding {
  clauseIndex: number;
  originalText: string;
  riskLevel: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  suggestion: string;
  relatedLaw?: string;
}

interface AIReviewResult {
  overallScore: number;
  summary: string;
  findings: AIReviewFinding[];
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

function getStrictnessInstruction(strictness: string): string {
  const map: Record<string, string> = {
    strict: '请以最严格的标准进行审核，即使轻微的不规范之处也应指出，宁可多报不可漏报。',
    medium: '请以适中标准进行审核，重点关注可能造成实质损害或重大争议的条款。',
    loose: '请以宽松标准进行审核，仅指出明显的违法条款或重大风险，忽略轻微不规范之处。',
  };
  return map[strictness] || map['medium'];
}

function buildSystemPrompt(
  templateSystemPrompt: string | null,
  dimensions: Array<{ name: string; prompt: string }>,
  strictness: string
): string {
  const basePrompt = templateSystemPrompt || '你是一名专业的中国法律师，擅长审核各类合同。请根据《中华人民共和国民法典》及相关法律法规，对合同进行全面审核。';

  const dimensionInstructions = dimensions.length > 0
    ? `\n\n请重点关注以下审核维度：\n${dimensions.map((d, i) => `${i + 1}. ${d.name}：${d.prompt}`).join('\n')}`
    : '';

  const strictnessInstruction = `\n\n审核严格度要求：${getStrictnessInstruction(strictness)}`;

  const outputFormat = `

请严格按照以下JSON格式输出审核结果，不要输出任何其他内容：
{
  "overallScore": <0-100的整数，100表示无任何风险>,
  "summary": "<一段话总结审核结果，包含风险数量、重点关注领域和整体建议>",
  "findings": [
    {
      "clauseIndex": <条款在合同中的大致位置序号，从0开始>,
      "originalText": "<引用合同中存在问题的原文片段>",
      "riskLevel": "<high/medium/low>",
      "category": "<问题分类，如：薪资条款、违约责任等>",
      "description": "<具体问题描述，说明为什么这是一个风险点>",
      "suggestion": "<修改建议，说明应如何修改该条款>",
      "relatedLaw": "<相关法律依据，如：《劳动合同法》第二十条>"
    }
  ]
}`;

  return basePrompt + dimensionInstructions + strictnessInstruction + outputFormat;
}

export async function callAIReview(
  contractContent: string,
  templateSystemPrompt: string | null,
  dimensions: Array<{ name: string; prompt: string }>,
  strictness: string,
  customPrompt?: string
): Promise<AIReviewResult> {
  const apiKey = process.env.AI_API_KEY || '';
  const apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o';

  if (!apiKey) {
    throw new Error('AI_API_KEY not configured');
  }

  const systemPrompt = buildSystemPrompt(templateSystemPrompt, dimensions, strictness);

  let userPrompt = `请审核以下合同文本：\n\n${contractContent}`;
  if (customPrompt) {
    userPrompt = `${customPrompt}\n\n${userPrompt}`;
  }

  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response does not contain valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const findings: AIReviewFinding[] = (parsed.findings || []).map((f: any) => ({
    clauseIndex: f.clauseIndex ?? f.clause_index ?? 0,
    originalText: f.originalText ?? f.original_text ?? '',
    riskLevel: ['high', 'medium', 'low'].includes(f.riskLevel ?? f.risk_level) ? (f.riskLevel ?? f.risk_level) : 'medium',
    category: f.category ?? '',
    description: f.description ?? '',
    suggestion: f.suggestion ?? '',
    relatedLaw: f.relatedLaw ?? f.related_law ?? undefined,
  }));

  const riskDistribution = {
    high: findings.filter((f) => f.riskLevel === 'high').length,
    medium: findings.filter((f) => f.riskLevel === 'medium').length,
    low: findings.filter((f) => f.riskLevel === 'low').length,
  };

  return {
    overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : (typeof parsed.overall_score === 'number' ? parsed.overall_score : 50),
    summary: parsed.summary ?? '',
    findings,
    riskDistribution,
  };
}

export function isAIConfigured(): boolean {
  return !!(process.env.AI_API_KEY && process.env.AI_API_KEY.length > 0);
}
