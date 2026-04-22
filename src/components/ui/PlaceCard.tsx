'use client'

interface PlaceCardProps {
  name: string
  emoji: string
  visitors: string
  trend: string
  category?: string
  status?: 'live' | 'pending' | 'closed'
  onView?: () => void
}

const statusColors = {
  live:    { bg: 'rgba(26,122,110,0.1)',  text: '#1A7A6E' },
  pending: { bg: 'rgba(200,146,42,0.1)',  text: '#C8922A' },
  closed:  { bg: 'rgba(139,26,26,0.08)', text: '#8B1A1A' },
}

export default function PlaceCard({
  name,
  emoji,
  visitors,
  trend,
  category = 'Archaeological Site',
  status = 'live',
  onView,
}: PlaceCardProps) {
  const sc = statusColors[status]
  return (
    <div
      className="rounded-xl3 overflow-hidden card-lift cursor-pointer"
      style={{
        background: '#fff',
        border: '1px solid var(--sand)',
      }}
    >
      {/* Image placeholder with gradient */}
      <div
        className="w-full flex items-center justify-center relative"
        style={{
          height: 112,
          background: 'linear-gradient(135deg, var(--cream-dark) 0%, var(--sand) 100%)',
        }}
      >
        <span style={{ fontSize: 40 }}>{emoji}</span>
        {/* Status chip */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 font-medium capitalize"
          style={{ fontSize: 9, ...sc }}
        >
          {status === 'live' && (
            <span
              className="live-pulse rounded-full inline-block"
              style={{ width: 5, height: 5, background: sc.text }}
            />
          )}
          {status}
        </div>
      </div>

      <div className="px-4 py-3">
        {/* Category */}
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.5px' }}>
          {category}
        </div>

        {/* Name */}
        <div
          className="font-serif font-bold leading-tight mb-3"
          style={{ fontSize: 15, color: 'var(--text-dark)' }}
        >
          {name}
        </div>

        {/* Visitors row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 300 }}>Total Visitors</div>
            <div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>
              {visitors}
            </div>
          </div>
          <div
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
            style={{
              fontSize: 10,
              background: 'rgba(26,122,110,0.08)',
              color: 'var(--teal)',
            }}
          >
            ↑ {trend}
          </div>
        </div>

        {/* CTA button */}
        <button
          onClick={onView}
          className="w-full rounded-lg py-2 text-white font-medium transition-colors"
          style={{
            background: 'var(--maroon)',
            fontSize: 11,
            letterSpacing: '0.4px',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--maroon-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--maroon)')}
        >
          View Details
        </button>
      </div>
    </div>
  )
}
