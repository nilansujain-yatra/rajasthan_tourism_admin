'use client'

export interface BarRow {
  label: string
  percent: number
  gradient: string
}

const DEFAULT_BARS: BarRow[] = [
  { label: 'Online',   percent: 55, gradient: 'linear-gradient(90deg, #8B1A1A, #A83030)' },
  { label: 'Kiosk',   percent: 27, gradient: 'linear-gradient(90deg, #C8922A, #E8B84B)' },
  { label: 'Counter', percent: 18, gradient: 'linear-gradient(90deg, #1A7A6E, #2A9A8C)' },
]

// Simple sparkline points
const TREND_POINTS = [
  [0, 55], [45, 45], [90, 30], [135, 38], [180, 22], [225, 18], [270, 12], [315, 9], [320, 8],
]

type BarChartProps = {
  bars?: BarRow[]
}

export default function BarChart({ bars = DEFAULT_BARS }: BarChartProps) {
  const pathD = TREND_POINTS
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`)
    .join(' ')

  const fillD = pathD + ` L320,70 L0,70 Z`

  return (
    <div>
      {/* Bar rows */}
      <div className="flex flex-col gap-3 mb-6">
        {bars.map(bar => (
          <div key={bar.label} className="flex items-center gap-3">
            <div
              className="text-right flex-shrink-0"
              style={{ width: 56, fontSize: 11, color: 'var(--text-muted)' }}
            >
              {bar.label}
            </div>
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 10, background: 'var(--cream-dark)' }}
            >
              <div
                className="h-full rounded-full bar-animated"
                style={{
                  width: `${bar.percent}%`,
                  background: bar.gradient,
                }}
              />
            </div>
            <div
              className="font-medium flex-shrink-0"
              style={{ width: 32, fontSize: 11, color: 'var(--text-dark)', textAlign: 'right' }}
            >
              {bar.percent}%
            </div>
          </div>
        ))}
      </div>

      {/* Sparkline: Monthly trend */}
      <div
        className="pt-4"
        style={{ borderTop: '1px solid var(--sand)' }}
      >
        <div
          className="font-medium mb-3"
          style={{ fontSize: 11, color: 'var(--text-muted)' }}
        >
          Monthly Booking Trend
        </div>
        <svg width="100%" height="72" viewBox="0 0 320 72" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B1A1A" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#8B1A1A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill="url(#trendGrad)" />
          <path d={pathD} fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Highlight dots */}
          <circle cx={90}  cy={38} r="3.5" fill="#8B1A1A" />
          <circle cx={180} cy={22} r="3.5" fill="#8B1A1A" />
          <circle cx={270} cy={12} r="3.5" fill="#C8922A" />
        </svg>
        <div className="flex justify-between mt-1" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'].map(m => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
