import { create } from 'zustand';
import type { Review, PromptTemplate, ReviewRequest } from '../../shared/types';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AppState {
  currentContract: { title: string; content: string };
  selectedTemplateId: string | null;
  customPrompt: string;
  selectedDimensions: string[];
  strictness: 'low' | 'medium' | 'high';
  currentReview: Review | null;
  isReviewing: boolean;
  templates: PromptTemplate[];
  reviews: Review[];
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AppActions {
  setContract: (title: string, text: string) => void;
  setSelectedTemplate: (id: string | null) => void;
  setCustomPrompt: (prompt: string) => void;
  toggleDimension: (id: string) => void;
  setSelectedDimensions: (ids: string[]) => void;
  setStrictness: (level: 'low' | 'medium' | 'high') => void;
  startReview: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchReviews: () => Promise<void>;
  fetchReviewById: (id: string) => Promise<void>;
  resetReview: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  upgradeRole: () => Promise<void>;
}

const savedToken = localStorage.getItem('contractai_token');
const savedUser = localStorage.getItem('contractai_user');
let parsedUser: User | null = null;
try {
  if (savedUser) parsedUser = JSON.parse(savedUser);
} catch {
  parsedUser = null;
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  currentContract: { title: '', content: '' },
  selectedTemplateId: null,
  customPrompt: '',
  selectedDimensions: [],
  strictness: 'medium',
  currentReview: null,
  isReviewing: false,
  templates: [],
  reviews: [],
  user: parsedUser,
  token: savedToken,
  isAuthenticated: !!savedToken,

  setContract: (title, text) => {
    set({ currentContract: { title, content: text } });
  },

  setSelectedTemplate: (id) => {
    set({ selectedTemplateId: id });
  },

  setCustomPrompt: (prompt) => {
    set({ customPrompt: prompt });
  },

  toggleDimension: (id) => {
    set((state) => {
      const exists = state.selectedDimensions.includes(id);
      return {
        selectedDimensions: exists
          ? state.selectedDimensions.filter((d) => d !== id)
          : [...state.selectedDimensions, id],
      };
    });
  },

  setSelectedDimensions: (ids) => {
    set({ selectedDimensions: ids });
  },

  setStrictness: (level) => {
    set({ strictness: level });
  },

  startReview: async () => {
    const { currentContract, selectedTemplateId, customPrompt, selectedDimensions, strictness, token } = get();

    set({ isReviewing: true, currentReview: null });

    const strictnessMap: Record<string, string> = {
      low: 'loose',
      medium: 'medium',
      high: 'strict',
    };

    const body = {
      title: currentContract.title,
      content: currentContract.content,
      source: 'paste',
      template_id: selectedTemplateId || undefined,
      custom_prompt: customPrompt || undefined,
      focus_dimensions: selectedDimensions,
      strictness: strictnessMap[strictness] || 'medium',
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data;
        const review: Review = {
          id: data.id,
          contractId: data.contract_id,
          templateId: data.template_id || undefined,
          customPrompt: data.custom_prompt || undefined,
          strictness: data.strictness === 'strict' ? 'high' : data.strictness === 'loose' ? 'low' : 'medium',
          overallScore: data.overall_score,
          summary: data.summary,
          findings: (data.findings || []).map((f: any) => ({
            id: f.id,
            clauseIndex: f.clause_index,
            originalText: f.original_text,
            riskLevel: f.risk_level,
            category: f.category,
            description: f.description,
            suggestion: f.suggestion,
            relatedLaw: f.related_law,
          })),
          riskDistribution: typeof data.risk_distribution === 'string'
            ? JSON.parse(data.risk_distribution)
            : data.risk_distribution || { high: 0, medium: 0, low: 0 },
          status: data.status || 'completed',
          createdAt: data.created_at,
        };
        set({ currentReview: review, isReviewing: false });
      } else {
        set({ isReviewing: false });
      }
    } catch (_e) {
      set({ isReviewing: false });
    }
  },

  fetchTemplates: async () => {
    try {
      const res = await fetch('/api/templates');
      const json = await res.json();
      if (json.success && json.data) {
        const templates: PromptTemplate[] = json.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          systemPrompt: t.system_prompt,
          focusDimensions: (t.focus_dimensions || []).map((d: any) => ({
            id: d.id,
            templateId: d.template_id,
            name: d.name,
            description: d.description,
            prompt: d.prompt,
            enabled: d.enabled,
          })),
          isBuiltin: t.is_builtin,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        set({ templates });
      }
    } catch (_e) {
      void _e;
    }
  },

  fetchReviews: async () => {
    try {
      const res = await fetch('/api/review');
      const json = await res.json();
      if (json.success && json.data) {
        const items = json.data.items || json.data;
        const reviews: Review[] = items.map((r: any) => ({
          id: r.id,
          contractId: r.contract_id,
          title: r.title || r.contract_title || undefined,
          templateId: r.template_id || undefined,
          strictness: r.strictness === 'strict' ? 'high' : r.strictness === 'loose' ? 'low' : 'medium',
          overallScore: r.overall_score,
          summary: r.summary,
          findings: [],
          riskDistribution: typeof r.risk_distribution === 'string'
            ? JSON.parse(r.risk_distribution)
            : r.risk_distribution || { high: 0, medium: 0, low: 0 },
          status: r.status || 'completed',
          createdAt: r.created_at,
        }));
        set({ reviews });
      }
    } catch (_e) {
      void _e;
    }
  },

  fetchReviewById: async (id) => {
    try {
      const res = await fetch(`/api/review/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        const review: Review = {
          id: data.id,
          contractId: data.contract_id,
          templateId: data.template_id || undefined,
          customPrompt: data.custom_prompt || undefined,
          strictness: data.strictness === 'strict' ? 'high' : data.strictness === 'loose' ? 'low' : 'medium',
          overallScore: data.overall_score,
          summary: data.summary,
          findings: (data.findings || []).map((f: any) => ({
            id: f.id,
            clauseIndex: f.clause_index,
            originalText: f.original_text,
            riskLevel: f.risk_level,
            category: f.category,
            description: f.description,
            suggestion: f.suggestion,
            relatedLaw: f.related_law,
          })),
          riskDistribution: typeof data.risk_distribution === 'string'
            ? JSON.parse(data.risk_distribution)
            : data.risk_distribution || { high: 0, medium: 0, low: 0 },
          status: data.status || 'completed',
          createdAt: data.created_at,
        };
        set({ currentReview: review });
      }
    } catch (_e) {
      void _e;
    }
  },

  resetReview: () => {
    set({ currentReview: null, isReviewing: false });
  },

  login: async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      const { user, token } = json.data;
      localStorage.setItem('contractai_token', token);
      localStorage.setItem('contractai_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    } else {
      throw new Error(json.message || '登录失败');
    }
  },

  register: async (email, password, name) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      const { user, token } = json.data;
      localStorage.setItem('contractai_token', token);
      localStorage.setItem('contractai_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    } else {
      throw new Error(json.message || '注册失败');
    }
  },

  logout: () => {
    localStorage.removeItem('contractai_token');
    localStorage.removeItem('contractai_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchCurrentUser: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const user = json.data;
        localStorage.setItem('contractai_user', JSON.stringify(user));
        set({ user });
      } else {
        get().logout();
      }
    } catch {
      get().logout();
    }
  },

  upgradeRole: async () => {
    const { token } = get();
    if (!token) return;
    const res = await fetch('/api/auth/upgrade', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (json.success && json.data) {
      const { user, token: newToken } = json.data;
      localStorage.setItem('contractai_token', newToken);
      localStorage.setItem('contractai_user', JSON.stringify(user));
      set({ user, token: newToken });
    } else {
      throw new Error(json.message || '升级失败');
    }
  },
}));
