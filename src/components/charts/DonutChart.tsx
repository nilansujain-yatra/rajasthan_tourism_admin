'use client'

const CIRCUMFERENCE = 2 * Math.PI * 50 // r=50

interface Segment {
  label: string
  value: number
  count: string
  color: string
}

const SEGMENTS: Segment[] = [
  { label: 'Indian Visitors', value: 46, count: '1,79,799', color: '#8B1A1A' },
  { label: 'Indian Student',  value: 20, count: '62,799',   color: '#C8922A' },
  { label: 'Foreign Visitor', value: 10, count: '10,793',   color: '#1A7A6E' },
  { label: 'Foreign Student', value: 5,  count: '57',       color: '#E8B84B' },
  { label: 'Divyang',         value: 8,  count: '18',       color: '#A83030' },
  { label: 'Misc',            value: 11, count: '—',        color: '#C9B48A' },
]

export default function DonutChart() {
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      {/* SVG */}
      <svg
        width={140} height={140} viewBox="0 0 130 130"
        className="flex-shrink-0"
      >
        {/* Track */}
        <circle
          cx={65} cy={65} r={50}
          fill="none"
          stroke="var(--sand)"
          strokeWidth={18}
        />

        {/* Segments */}
        {SEGMENTS.map(seg => {
          const dashArray = (seg.value / 100) * CIRCUMFERENCE
          const dashOffset = -offset
          offset += dashArray
          return (
            <circle
              key={seg.label}
              cx={65} cy={65} r={50}
              fill="none"
              stroke={seg.color}
              strokeWidth={18}
              strokeDasharray={`${dashArray} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px' }}
            />
          )
        })}

        {/* Center label */}
        <text
          x={65} y={61}
          textAnchor="middle"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, fill: 'var(--text-dark)' }}
        >
          46%
        </text>
        <text
          x={65} y={76}
          textAnchor="middle"
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 9, fill: 'var(--text-muted)' }}
        >
          Top Segment
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2 flex-1">
        {SEGMENTS.map(seg => (
          <div key={seg.label} className="flex items-center gap-2" style={{ fontSize: 12 }}>
            <span
              className="rounded-full flex-shrink-0"
              style={{ width: 9, height: 9, background: seg.color }}
            />
            <span className="flex-1" style={{ color: 'var(--text-mid)' }}>{seg.label}</span>
            <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{seg.value}%</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({seg.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
