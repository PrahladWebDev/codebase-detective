import { scoreColor } from '../utils/format';

// The signature element: a magnifying-lens gauge with an amber spotlight
// glow whose intensity and color track the health score.
export default function HealthGauge({ score, size = 168 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-40"
        style={{ background: `radial-gradient(circle, ${color}55 0%, transparent 70%)` }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1F2530" strokeWidth={10} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-semibold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs uppercase tracking-wider text-paper-500">/ 100</span>
      </div>
      {/* handle of the "magnifying glass" */}
      <div
        className="absolute bg-ink-600 rounded-full"
        style={{ width: 8, height: 34, right: -2, bottom: -2, transform: 'rotate(45deg)' }}
      />
    </div>
  );
}
