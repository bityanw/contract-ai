import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Play, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { DEFAULT_DIMENSIONS } from './ContractInput';

const STRICTNESS_OPTIONS: { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'low', label: '宽松' },
  { value: 'medium', label: '适中' },
  { value: 'high', label: '严格' },
];

export default function ReviewConfig() {
  const {
    templates,
    selectedTemplateId,
    selectedDimensions,
    strictness,
    isReviewing,
    currentContract,
    customPrompt,
    setSelectedTemplate,
    setSelectedDimensions,
    toggleDimension,
    setStrictness,
    setCustomPrompt,
    startReview,
  } = useAppStore();

  const [promptExpanded, setPromptExpanded] = useState(false);

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);
  const dimensions = currentTemplate
    ? currentTemplate.focusDimensions.map((d) => ({ id: d.id, name: d.name }))
    : DEFAULT_DIMENSIONS;

  const handleTemplateChange = (id: string) => {
    if (!id) {
      setSelectedTemplate(null);
      setSelectedDimensions([]);
      return;
    }
    setSelectedTemplate(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSelectedDimensions(tpl.focusDimensions.map((d) => d.id));
    }
  };

  return (
    <div className="card flex flex-col gap-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
        <Settings className="h-5 w-5 text-[#e2b340]" />
        审核配置
      </h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">审核模板</label>
        <select
          value={selectedTemplateId || ''}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="input-field cursor-pointer appearance-none"
        >
          <option value="">通用审核</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">关注维度</label>
        <div className="flex flex-wrap gap-2">
          {dimensions.map((d) => (
            <button
              key={d.id}
              onClick={() => toggleDimension(d.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedDimensions.includes(d.id)
                  ? 'bg-[#e2b340]/20 text-[#e2b340] ring-1 ring-[#e2b340]/40'
                  : 'bg-[#2a2a4a] text-gray-400 hover:bg-[#3a3a5a]'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => setPromptExpanded(!promptExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
        >
          自定义提示词
          {promptExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {promptExpanded && (
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="输入自定义审核提示词，补充或覆盖模板默认提示词..."
            className="input-field resize-none"
            rows={4}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">审核严格度</label>
        <div className="flex rounded-lg border border-[#2a2a4a] bg-[#0e0e22] p-0.5">
          {STRICTNESS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStrictness(opt.value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                strictness === opt.value
                  ? 'bg-[#e2b340] text-[#1a1a2e]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={startReview}
        disabled={isReviewing || !currentContract.content.trim()}
        className="btn-primary w-full"
      >
        {isReviewing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            审核中...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            启动审核
          </>
        )}
      </button>

      {isReviewing && (
        <div className="animate-pulse-glow flex items-center justify-center gap-2 text-xs text-[#e2b340]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e2b340]" />
          正在分析合同内容，请稍候...
        </div>
      )}
    </div>
  );
}
