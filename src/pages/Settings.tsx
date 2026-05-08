import { useState, useEffect } from 'react';
import { Settings, Key, Globe, Cpu, CheckCircle2, XCircle, Save, Eye, EyeOff } from 'lucide-react';

interface AIConfig {
  api_key: string;
  api_base_url: string;
  model: string;
  provider: string;
}

interface AIStatus {
  configured: boolean;
  model: string;
  provider: string;
}

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    description: 'GPT-4o 最佳质量，价格较高',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    description: '最高性价比，中文法律推理接近GPT-4',
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    description: '阿里云出品，中文法律场景优化',
  },
  {
    id: 'zhipu',
    name: '智谱GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4-flash', 'glm-4'],
    description: 'GLM-4 中文理解出色，价格适中',
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    models: [],
    description: '配置任意 OpenAI 兼容 API',
  },
];

export default function SettingsPage() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [config, setConfig] = useState<AIConfig>({
    api_key: '',
    api_base_url: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    provider: 'openai',
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setStatus(json.data);
          setConfig((c) => ({
            ...c,
            provider: json.data.provider || 'openai',
            model: json.data.model || 'gpt-4o',
          }));
        }
      })
      .catch(() => {});
  }, []);

  const currentProvider = PROVIDERS.find((p) => p.id === config.provider) || PROVIDERS[4];

  const handleProviderChange = (providerId: string) => {
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (provider) {
      setConfig((c) => ({
        ...c,
        provider: providerId,
        api_base_url: provider.baseUrl || c.api_base_url,
        model: provider.models[0] || c.model,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError('保存失败');
      }
    } catch {
      setError('网络错误，保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="h-6 w-6 text-brand-400" />
          AI 模型设置
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          配置 AI 大模型接口，启用真实智能审核。未配置时将使用模拟审核。
        </p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-zinc-300">当前状态</span>
          {status?.configured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={12} /> 已配置
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-500/15 text-zinc-400 border border-zinc-500/20">
              <XCircle size={12} /> 未配置
            </span>
          )}
        </div>
        {status?.configured && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">模型：</span>
              <span className="text-zinc-200">{status.model}</span>
            </div>
            <div>
              <span className="text-zinc-500">提供商：</span>
              <span className="text-zinc-200">{PROVIDERS.find(p => p.id === status.provider)?.name || status.provider}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            <Cpu className="inline h-4 w-4 mr-1.5 text-brand-400" />
            AI 服务提供商
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  config.provider === provider.id
                    ? 'border-brand-400/50 bg-brand-400/10 ring-1 ring-brand-400/30'
                    : 'border-[#2a2a4a] bg-[#12122a] hover:border-[#3a3a5a]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{provider.name}</span>
                  {config.provider === provider.id && (
                    <CheckCircle2 size={14} className="text-brand-400" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{provider.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <Key className="inline h-4 w-4 mr-1.5 text-brand-400" />
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={config.api_key}
              onChange={(e) => setConfig((c) => ({ ...c, api_key: e.target.value }))}
              placeholder="输入你的 API Key..."
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            {config.provider === 'deepseek' && '在 platform.deepseek.com 获取 API Key'}
            {config.provider === 'openai' && '在 platform.openai.com 获取 API Key'}
            {config.provider === 'qwen' && '在 dashscope.console.aliyun.com 获取 API Key'}
            {config.provider === 'zhipu' && '在 open.bigmodel.cn 获取 API Key'}
            {config.provider === 'custom' && '输入你的服务提供商 API Key'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <Globe className="inline h-4 w-4 mr-1.5 text-brand-400" />
            API Base URL
          </label>
          <input
            type="text"
            value={config.api_base_url}
            onChange={(e) => setConfig((c) => ({ ...c, api_base_url: e.target.value }))}
            placeholder="https://api.openai.com/v1"
            className="input-field"
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            OpenAI 兼容接口地址，选择提供商后自动填入
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <Cpu className="inline h-4 w-4 mr-1.5 text-brand-400" />
            模型名称
          </label>
          {currentProvider.models.length > 0 ? (
            <select
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              className="input-field cursor-pointer appearance-none"
            >
              {currentProvider.models.map((m) => (
                <option key={m} value={m} className="bg-[#1a1a2e]">
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              placeholder="模型名称，如 gpt-4o"
              className="input-field"
            />
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={16} /> AI 配置已保存，审核工作台将使用真实 AI 审核
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !config.api_key}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存配置'}
          </button>
          <p className="text-xs text-zinc-500">
            配置保存后立即生效，无需重启服务
          </p>
        </div>
      </div>

      <div className="mt-10 card">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">💡 模型推荐</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="shrink-0 px-2 py-0.5 text-xs rounded bg-brand-400/15 text-brand-400 border border-brand-400/20">最佳质量</span>
            <div>
              <p className="text-zinc-200 font-medium">GPT-4o / DeepSeek-Reasoner</p>
              <p className="text-zinc-500 text-xs">推理能力最强，法律条款分析最精准</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 px-2 py-0.5 text-xs rounded bg-emerald-400/15 text-emerald-400 border border-emerald-400/20">最高性价比</span>
            <div>
              <p className="text-zinc-200 font-medium">DeepSeek-Chat (deepseek-chat)</p>
              <p className="text-zinc-500 text-xs">价格约为 GPT-4 的 1/30，中文法律推理接近 GPT-4 水平</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 px-2 py-0.5 text-xs rounded bg-blue-400/15 text-blue-400 border border-blue-400/20">国产优选</span>
            <div>
              <p className="text-zinc-200 font-medium">通义千问 Qwen-Plus / 智谱 GLM-4-Plus</p>
              <p className="text-zinc-500 text-xs">中文法律场景优化好，国内访问稳定</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
