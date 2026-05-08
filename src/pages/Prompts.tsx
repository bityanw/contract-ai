import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Crown } from 'lucide-react';
import { useAppStore } from '@/store';
import type { PromptTemplate } from '../../shared/types';
import { cn } from '@/lib/utils';

const CATEGORIES = ['全部', '劳动合同', '租赁合同', '采购合同', '服务合同', '保密协议', '自定义'];
const CATEGORY_OPTIONS = CATEGORIES.slice(1);

interface DimensionInput {
  name: string;
  prompt: string;
}

const emptyForm = {
  name: '',
  category: '自定义',
  description: '',
  systemPrompt: '',
  dimensions: [] as DimensionInput[],
};

export default function Prompts() {
  const { templates, fetchTemplates, isAuthenticated, user } = useAppStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canEdit = isAuthenticated && user && (user.role === 'pro' || user.role === 'admin');

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = templates.filter((t) => {
    const matchSearch = t.name.includes(search) || t.description.includes(search);
    const matchCategory = category === '全部' || t.category === category;
    return matchSearch && matchCategory;
  });

  const openCreate = () => {
    if (!canEdit) return;
    setEditingId(null);
    setForm({ ...emptyForm, dimensions: [] });
    setModalOpen(true);
  };

  const openEdit = (t: PromptTemplate) => {
    if (!canEdit) return;
    setEditingId(t.id);
    setForm({
      name: t.name,
      category: t.category,
      description: t.description,
      systemPrompt: t.systemPrompt,
      dimensions: t.focusDimensions.map((d) => ({ name: d.name, prompt: d.prompt })),
    });
    setModalOpen(true);
  };

  const addDimension = () => {
    setForm((f) => ({ ...f, dimensions: [...f.dimensions, { name: '', prompt: '' }] }));
  };

  const removeDimension = (idx: number) => {
    setForm((f) => ({ ...f, dimensions: f.dimensions.filter((_, i) => i !== idx) }));
  };

  const updateDimension = (idx: number, field: keyof DimensionInput, value: string) => {
    setForm((f) => ({
      ...f,
      dimensions: f.dimensions.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    }));
  };

  const handleSave = async () => {
    const body = {
      name: form.name,
      category: form.category,
      description: form.description,
      system_prompt: form.systemPrompt,
      focus_dimensions: form.dimensions.map((d) => ({ name: d.name, prompt: d.prompt })),
    };
    if (editingId) {
      await fetch(`/api/templates/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    setModalOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">提示词模板管理</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索模板..."
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e2b340]/50 w-64"
            />
          </div>
          <button
            onClick={openCreate}
            disabled={!canEdit}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              canEdit
                ? 'bg-[#e2b340] text-[#1a1a2e] hover:bg-[#e2b340]/90'
                : 'bg-white/5 text-white/30 cursor-not-allowed',
            )}
          >
            {canEdit ? <Plus className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
            {canEdit ? '创建模板' : '升级专业版解锁'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
              category === cat
                ? 'bg-[#e2b340] text-[#1a1a2e] font-medium'
                : 'bg-white/5 text-white/60 hover:bg-white/10',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="card-hover relative">
            {t.isBuiltin && (
              <span className="absolute top-3 right-3 px-2 py-0.5 text-xs bg-[#e2b340]/20 text-[#e2b340] border border-[#e2b340]/30 rounded">
                内置
              </span>
            )}
            <div className="flex items-start gap-2 mb-2 pr-12">
              <h3 className="text-lg font-semibold text-white">{t.name}</h3>
              <span className="shrink-0 px-2 py-0.5 text-xs border border-[#e2b340]/40 text-[#e2b340] rounded">
                {t.category}
              </span>
            </div>
            <p className="text-sm text-white/50 mb-3 line-clamp-2">{t.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {t.focusDimensions.map((d) => (
                <span key={d.id} className="px-2 py-0.5 text-xs bg-white/5 text-white/60 rounded">
                  {d.name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-white/5">
              <button
                onClick={() => openEdit(t)}
                disabled={t.isBuiltin || !canEdit}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors',
                  t.isBuiltin || !canEdit
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/60 hover:bg-white/10',
                )}
              >
                <Edit2 className="w-3 h-3" /> 编辑
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                disabled={t.isBuiltin || !canEdit}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors',
                  t.isBuiltin || !canEdit
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-red-400/60 hover:bg-red-400/10',
                )}
              >
                <Trash2 className="w-3 h-3" /> 删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-white/30 text-sm">暂无匹配的模板</p>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? '编辑模板' : '创建模板'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">模板名称</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#e2b340]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#e2b340]/50"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c} className="bg-[#1a1a2e]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">描述</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#e2b340]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">系统提示词</label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#e2b340]/50 resize-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/60">关注维度</label>
                  <button
                    onClick={addDimension}
                    className="flex items-center gap-1 text-xs text-[#e2b340] hover:text-[#e2b340]/80"
                  >
                    <Plus className="w-3 h-3" /> 添加维度
                  </button>
                </div>
                <div className="space-y-2">
                  {form.dimensions.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={d.name}
                        onChange={(e) => updateDimension(i, 'name', e.target.value)}
                        placeholder="维度名称"
                        className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-[#e2b340]/50"
                      />
                      <input
                        value={d.prompt}
                        onChange={(e) => updateDimension(i, 'prompt', e.target.value)}
                        placeholder="提示词"
                        className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-[#e2b340]/50"
                      />
                      <button
                        onClick={() => removeDimension(i)}
                        className="text-red-400/60 hover:text-red-400 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-[#e2b340] text-[#1a1a2e] rounded-lg font-medium hover:bg-[#e2b340]/90 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
