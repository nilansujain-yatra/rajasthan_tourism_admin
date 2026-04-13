interface SectionHeaderProps {
  title: string
  right?: React.ReactNode
}

export default function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {/* Left ornament */}
      <div
        className="flex-shrink-0"
        style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--gold), var(--maroon))', borderRadius: 99 }}
      />

      {/* Title */}
      <span
        className="font-semibold tracking-widest uppercase"
        style={{ fontSize: 10, color: 'var(--maroon)', letterSpacing: '1.8px' }}
      >
        {title}
      </span>

      {/* Divider line */}
      <div className="flex-1 h-px" style={{ background: 'var(--sand)' }} />

      {/* Right slot */}
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}
