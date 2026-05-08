import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

interface RiskBadgeProps {
  level: "high" | "medium" | "low";
  showIcon?: boolean;
  count?: number;
  showCount?: boolean;
}

const config = {
  high: { className: "badge-high", Icon: AlertTriangle, label: "高风险" },
  medium: { className: "badge-medium", Icon: AlertCircle, label: "中风险" },
  low: { className: "badge-low", Icon: CheckCircle, label: "低风险" },
};

export default function RiskBadge({ level, showIcon = true, count, showCount }: RiskBadgeProps) {
  const { className, Icon, label } = config[level];

  return (
    <span className={className}>
      {showIcon && <Icon size={12} />}
      {label}
      {showCount && count !== undefined && (
        <span className="ml-0.5 font-semibold">{count}</span>
      )}
    </span>
  );
}
