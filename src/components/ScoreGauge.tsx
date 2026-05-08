import { useEffect, useRef, useState } from "react";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "lg" | number;
}

function getColor(score: number): string {
  if (score <= 40) return "#ef4444";
  if (score <= 70) return "#f59e0b";
  return "#22c55e";
}

function resolveSize(size: "sm" | "lg" | number) {
  if (typeof size === "number") {
    const outer = size;
    const strokeWidth = size >= 120 ? 8 : 6;
    const fontSize = size >= 120 ? "text-2xl" : "text-lg";
    return { outer, strokeWidth, fontSize };
  }
  const map = {
    sm: { outer: 80, strokeWidth: 6, fontSize: "text-lg" },
    lg: { outer: 120, strokeWidth: 8, fontSize: "text-2xl" },
  };
  return map[size];
}

export default function ScoreGauge({ score, size = "sm" }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const startRef = useRef(0);
  const { outer, strokeWidth, fontSize } = resolveSize(size);
  const radius = (outer - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getColor(score);

  useEffect(() => {
    let frame: number;
    const start = startRef.current;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + (score - start) * eased);
      setAnimatedScore(next);
      startRef.current = next;
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: outer, height: outer }}>
      <svg width={outer} height={outer} className="-rotate-90">
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke="rgba(100,116,139,0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className={`absolute font-semibold ${fontSize}`} style={{ color }}>
        {animatedScore}
      </span>
    </div>
  );
}
