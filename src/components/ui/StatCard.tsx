import clsx from 'clsx'

type StatCardVariant = 'maroon' | 'teal' | 'gold' | 'light'

interface StatCardProps {
  label: string
  value: string
  badge?: string
  icon?: string
  variant?: StatCardVariant
  trend?: string
}

const variantStyles: Record<StatCardVariant, React.CSSProperties> = {
  maroon: {
    background: 'linear-gradient(135deg, #6B1212 0%, #A83030 100%)',
    color: '#fff',
  },
  teal: {
    background: 'linear-gradient(135deg, #1A7A6E 0%, #2A9A8C 100%)',
    color: '#fff',
  },
  gold: {
    background: 'linear-gradient(135deg, #B87820 0%, #E8B84B 100%)',
    color: '#fff',
  },
  light: {
    background: '#fff',
    color: 'var(--text-dark)',
    border: '1px solid var(--sand)',
  },
}

export default function StatCard({
  label,
  value,
  badge,
  icon,
  variant = 'light',
  trend,
}: StatCardProps) {
  const isLight = variant === 'light'

  return (
    <div
      className="stat-deco rounded-xl3 px-5 py-5 relative overflow-hidden card-lift"
      style={variantStyles[variant]}
    >
      {/* Decorative circle */}
      <div
        className="absolute top-0 right-0 pointer-events-none rounded-full"
        style={{
          width: 90,
          height: 90,
          marginTop: -28,
          marginRight: -28,
          background: 'rgba(255,255,255,0.10)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 pointer-events-none rounded-full"
        style={{
          width: 60,
          height: 60,
          marginBottom: -24,
          marginLeft: -16,
          background: 'rgba(255,255,255,0.05)',
        }}
      />

      {/* Label */}
      <div
        className="font-sans font-normal mb-2"
        style={{
          fontSize: 11,
          letterSpacing: '0.3px',
          opacity: isLight ? 1 : 0.82,
          color: isLight ? 'var(--text-muted)' : undefined,
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        className="font-serif font-bold leading-none"
        style={{
          fontSize: 30,
          letterSpacing: '-0.5px',
          color: isLight ? 'var(--maroon)' : undefined,
        }}
      >
        {value}
      </div>

      {/* Badge */}
      {badge && (
        <div
          className="inline-flex items-center gap-1 mt-2 rounded-full px-2.5 py-0.5 font-medium"
          style={{
            fontSize: 10,
            background: isLight ? 'rgba(139,26,26,0.08)' : 'rgba(255,255,255,0.2)',
            color: isLight ? 'var(--maroon)' : undefined,
          }}
        >
          {trend && <span>{trend}</span>}
          {badge}
        </div>
      )}

      {/* Icon */}
      {icon && (
        <div
          className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ fontSize: 36, opacity: isLight ? 0.15 : 0.2 }}
        >
          {icon}
        </div>
      )}
    </div>
  )
}
