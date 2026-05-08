import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReviewFinding } from '../../shared/types';
import RiskBadge from '@/components/RiskBadge';
import { cn } from '@/lib/utils';

const riskColors: Record<string, string> = {
  high: 'bg-risk-high',
  medium: 'bg-risk-medium',
  low: 'bg-risk-low',
};

const quoteColors: Record<string, string> = {
  high: 'border-risk-high',
  medium: 'border-risk-medium',
  low: 'border-risk-low',
};

interface FindingCardProps {
  finding: ReviewFinding;
  index: number;
}

export function FindingCard({ finding, index }: FindingCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative rounded-lg border border-white/[0.06] bg-navy-950/60 overflow-hidden')}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', riskColors[finding.riskLevel])} />
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 pl-5 flex items-center gap-3 hover:bg-white/[0.03] transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 text-white/40 shrink-0" /> : <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />}
        <RiskBadge level={finding.riskLevel} />
        <span className="text-sm font-medium text-white/80">{finding.category}</span>
        <span className="text-sm text-white/40 truncate flex-1">{finding.description}</span>
        <span className="text-xs text-white/20 shrink-0">#{index + 1}</span>
      </button>

      {open && (
        <div className="px-5 pb-4 pl-9 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <RiskBadge level={finding.riskLevel} />
              <span className="text-xs font-medium text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded">{finding.category}</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">{finding.description}</p>
          </div>

          <div className={cn('rounded-md bg-black/30 border-l-2 px-3 py-2', quoteColors[finding.riskLevel])}>
            <p className="text-xs text-white/30 mb-1">原文引用</p>
            <p className="text-sm text-white/60 leading-relaxed">{finding.originalText}</p>
          </div>

          <div className="rounded-md bg-brand-400/[0.06] border-l-2 border-brand-400 px-3 py-2">
            <p className="text-xs text-brand-400/70 mb-1">修改建议</p>
            <p className="text-sm text-white/70 leading-relaxed">{finding.suggestion}</p>
          </div>

          {finding.relatedLaw && (
            <p className="text-xs text-white/30">
              <span className="text-white/20">法律依据：</span>{finding.relatedLaw}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
