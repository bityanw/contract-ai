import { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, FileText, Clock, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import ScoreGauge from '@/components/ScoreGauge';
import { cn } from '@/lib/utils';

type RiskFilter = 'all' | 'high' | 'medium' | 'low';
type SortMode = 'time' | 'score';

export default function History() {
  const { reviews, fetchReviews } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('time');

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filtered = reviews
    .filter((r) => {
      const title = r.title || r.summary;
      const matchSearch = title.includes(search);
      if (riskFilter === 'all') return matchSearch;
      const dist = r.riskDistribution;
      if (riskFilter === 'high') return matchSearch && dist.high > 0;
      if (riskFilter === 'medium') return matchSearch && dist.medium > 0;
      return matchSearch && dist.low > 0;
    })
    .sort((a, b) => {
      if (sortMode === 'time') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return b.overallScore - a.overallScore;
    });

  const riskFilters: { key: RiskFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'high', label: '高风险' },
    { key: 'medium', label: '中风险' },
    { key: 'low', label: '低风险' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">审核历史</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索合同标题..."
            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e2b340]/50 w-64"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          {riskFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setRiskFilter(f.key)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-colors',
                riskFilter === f.key
                  ? 'bg-[#e2b340] text-[#1a1a2e] font-medium'
                  : 'bg-white/5 text-white/50 hover:bg-white/10',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortMode((m) => (m === 'time' ? 'score' : 'time'))}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/50 rounded-lg text-xs hover:bg-white/10 transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortMode === 'time' ? '按时间' : '按评分'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <FileText className="w-16 h-16 text-white/10 mb-4" />
          <p className="text-white/30 text-sm mb-2">暂无审核记录</p>
          <p className="text-white/20 text-xs mb-6">前往审核工作台开始您的第一次合同审核</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#e2b340] text-[#1a1a2e] rounded-lg text-sm font-medium hover:bg-[#e2b340]/90 transition-colors"
          >
            前往审核
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="card-hover flex items-center gap-5">
              <ScoreGauge score={r.overallScore} size="sm" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white truncate">
                  {r.title || r.summary.slice(0, 30)}
                </h3>
                <p className="text-sm text-white/40 line-clamp-2 mt-0.5">{r.summary}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/30">
                  <Clock className="w-3 h-3" />
                  {new Date(r.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex gap-3 text-xs">
                  <span className="text-red-400">{r.riskDistribution.high} 高</span>
                  <span className="text-amber-400">{r.riskDistribution.medium} 中</span>
                  <span className="text-emerald-400">{r.riskDistribution.low} 低</span>
                </div>
                <button
                  onClick={() => navigate(`/report/${r.id}`)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#e2b340] border border-[#e2b340]/30 rounded hover:bg-[#e2b340]/10 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> 查看报告
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
