import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store';
import ScoreGauge from '@/components/ScoreGauge';
import RiskBadge from '@/components/RiskBadge';
import type { ReviewFinding } from '../../shared/types';

const riskBorderColor: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-emerald-500',
};

function FindingCard({ finding, index }: { finding: ReviewFinding; index: number }) {
  return (
    <div
      className={`animate-slide-in rounded-lg border border-[#2a2a4a] border-l-4 ${riskBorderColor[finding.riskLevel]} bg-[#12122a] p-4`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <RiskBadge level={finding.riskLevel} />
        <span className="rounded-md bg-[#2a2a4a] px-2 py-0.5 text-xs text-gray-300">{finding.category}</span>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-gray-300">{finding.description}</p>

      <blockquote className="mb-3 rounded-md bg-[#0e0e22] px-3 py-2 text-xs italic text-gray-500">
        「{finding.originalText}」
      </blockquote>

      <div className="mb-3 border-l-2 border-[#e2b340] pl-3">
        <p className="text-xs font-medium text-[#e2b340]">修改建议</p>
        <p className="mt-1 text-sm text-gray-300">{finding.suggestion}</p>
      </div>

      {finding.relatedLaw && (
        <p className="text-xs text-gray-500">相关法律：{finding.relatedLaw}</p>
      )}
    </div>
  );
}

export default function ReviewResults() {
  const currentReview = useAppStore((s) => s.currentReview);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentReview) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentReview]);

  if (!currentReview) return null;

  const { overallScore, riskDistribution, summary, findings, id } = currentReview;

  return (
    <div ref={resultsRef} className="flex flex-col gap-6">
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-shrink-0">
          <ScoreGauge score={overallScore} size={120} />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge level="high" count={riskDistribution.high} showCount />
            <RiskBadge level="medium" count={riskDistribution.medium} showCount />
            <RiskBadge level="low" count={riskDistribution.low} showCount />
          </div>
          <p className="text-sm leading-relaxed text-gray-400">{summary}</p>
        </div>

        <Link
          to={`/report/${id}`}
          className="flex-shrink-0 rounded-lg border border-[#e2b340]/30 px-4 py-2 text-sm font-medium text-[#e2b340] transition-colors hover:bg-[#e2b340]/10"
        >
          查看完整报告
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-gray-200">审核发现</h3>
        {findings.map((f, i) => (
          <FindingCard key={f.id} finding={f} index={i} />
        ))}
      </div>
    </div>
  );
}
