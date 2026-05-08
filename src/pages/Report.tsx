import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Clock, BookOpen, Sliders } from 'lucide-react';
import { useAppStore } from '@/store';
import ScoreGauge from '@/components/ScoreGauge';
import { RiskDonut } from '@/components/RiskDonut';
import { FindingCard } from '@/components/FindingCard';
import { cn } from '@/lib/utils';

type FilterLevel = 'all' | 'high' | 'medium' | 'low';

const strictnessMap: Record<string, string> = { low: '宽松', medium: '中等', high: '严格' };

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-white/5" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="h-[120px] w-[120px] rounded-full bg-white/5 mx-auto" />
        <div className="space-y-4 py-4">
          <div className="h-[140px] w-[140px] rounded-full bg-white/5 mx-auto" />
          <div className="h-4 w-32 rounded bg-white/5 mx-auto" />
        </div>
        <div className="space-y-3 py-4">
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-3/4 rounded bg-white/5" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}

function exportMarkdown(review: NonNullable<ReturnType<typeof useAppStore.getState>['currentReview']>) {
  const rd = review.riskDistribution;
  const lines = [
    '# 合同审核报告\n',
    '## 审核概览',
    `- 综合评分：${review.overallScore}/100`,
    `- 高风险：${rd.high}项 | 中风险：${rd.medium}项 | 低风险：${rd.low}项\n`,
    '## 审核摘要',
    review.summary + '\n',
    '## 详细发现\n',
  ];
  review.findings.forEach((f, i) => {
    const levelMap: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
    lines.push(`### ${i + 1}. ${f.category} - ${levelMap[f.riskLevel]}`);
    lines.push(`**问题描述：** ${f.description}\n`);
    lines.push(`**原文引用：** ${f.originalText}\n`);
    lines.push(`**修改建议：** ${f.suggestion}\n`);
    if (f.relatedLaw) lines.push(`**法律依据：** ${f.relatedLaw}\n`);
    lines.push('---\n');
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `审核报告_${review.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentReview, isReviewing, fetchReviewById } = useAppStore();
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchReviewById(id).finally(() => setLoading(false));
    }
  }, [id, fetchReviewById]);

  const filteredFindings = useMemo(() => {
    if (!currentReview) return [];
    if (filter === 'all') return currentReview.findings;
    return currentReview.findings.filter((f) => f.riskLevel === filter);
  }, [currentReview, filter]);

  const tabs: { key: FilterLevel; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'high', label: '高风险' },
    { key: 'medium', label: '中风险' },
    { key: 'low', label: '低风险' },
  ];

  if (loading || isReviewing) {
    return <Skeleton />;
  }

  if (!currentReview) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <FileText className="h-12 w-12 text-white/20 mx-auto" />
          <p className="text-white/40">未找到审核记录</p>
        </div>
      </div>
    );
  }

  const rd = currentReview.riskDistribution;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/history')} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />返回历史记录
        </button>
        <h1 className="text-xl font-bold text-white">审核报告</h1>
        <button onClick={() => exportMarkdown(currentReview)} className="flex items-center gap-1.5 rounded-lg bg-brand-400/15 px-3 py-1.5 text-sm text-brand-400 hover:bg-brand-400/25 transition-colors">
          <Download className="h-3.5 w-3.5" />导出 Markdown
        </button>
      </div>

      <section className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="flex justify-center">
            <ScoreGauge score={currentReview.overallScore} size="lg" />
          </div>
          <div className="flex justify-center">
            <RiskDonut distribution={rd} />
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-white/40 mb-1">审核摘要</h2>
              <p className="text-sm text-white/70 leading-relaxed">{currentReview.summary}</p>
            </div>
            <div className="space-y-2 text-xs text-white/40">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>审核时间：{new Date(currentReview.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              {currentReview.templateId && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>使用模板：{currentReview.templateId}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5" />
                <span>严格度：{strictnessMap[currentReview.strictness]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition-colors',
                filter === tab.key
                  ? 'bg-brand-400 text-navy-900 font-medium'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1 opacity-70">{rd[tab.key as keyof typeof rd]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filteredFindings.map((f) => (
            <FindingCard key={f.id} finding={f} index={currentReview.findings.indexOf(f)} />
          ))}
          {filteredFindings.length === 0 && (
            <div className="py-12 text-center text-sm text-white/30">暂无该风险等级的发现</div>
          )}
        </div>
      </section>
    </div>
  );
}
