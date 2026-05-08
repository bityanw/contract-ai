import type { RiskDistribution } from '../../shared/types';

interface RiskDonutProps {
  distribution: RiskDistribution;
}

export function RiskDonut({ distribution }: RiskDonutProps) {
  const total = distribution.high + distribution.medium + distribution.low;
  const size = 140;
  const strokeWidth = 22;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const segments = [
    { value: distribution.high, color: '#ef4444', label: '高风险' },
    { value: distribution.medium, color: '#f59e0b', label: '中风险' },
    { value: distribution.low, color: '#22c55e', label: '低风险' },
  ];

  let accumulated = 0;
  const arcs = segments.map((seg) => {
    const ratio = total > 0 ? seg.value / total : 0;
    const offset = circumference - (accumulated + ratio) * circumference;
    accumulated += ratio;
    return { ...seg, ratio, dashArray: circumference, dashOffset: offset };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" className="text-white/10" strokeWidth={strokeWidth} />
        {arcs.map((arc) =>
          arc.ratio > 0 ? (
            <circle
              key={arc.label}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color} strokeWidth={strokeWidth} strokeLinecap="butt"
              strokeDasharray={arc.dashArray} strokeDashoffset={arc.dashOffset}
              className="transition-all duration-500"
            />
          ) : null
        )}
      </svg>
      <div className="flex gap-4 text-xs">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-white/60">{s.label}</span>
            <span className="font-medium text-white/90">{s.value}项</span>
          </span>
        ))}
      </div>
    </div>
  );
}
