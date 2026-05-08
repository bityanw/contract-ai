export interface Contract {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
}

export interface ReviewFinding {
  id: string;
  clauseIndex: number;
  originalText: string;
  riskLevel: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  suggestion: string;
  relatedLaw?: string;
}

export interface RiskDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface Review {
  id: string;
  contractId: string;
  title?: string;
  templateId?: string;
  customPrompt?: string;
  strictness: 'low' | 'medium' | 'high';
  overallScore: number;
  summary: string;
  findings: ReviewFinding[];
  riskDistribution: RiskDistribution;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface FocusDimension {
  id: string;
  templateId: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  focusDimensions: FocusDimension[];
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequest {
  contractText: string;
  title: string;
  templateId?: string;
  customPrompt?: string;
  focusDimensions: string[];
  strictness: 'low' | 'medium' | 'high';
}
