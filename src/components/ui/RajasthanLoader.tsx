type RajasthanLoaderProps = {
  label?: string
}

export default function RajasthanLoader({ label = 'Loading places...' }: RajasthanLoaderProps) {
  return (
    <div className="min-h-[calc(100vh-62px)] w-full flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <div className="raj-loader" aria-hidden="true">
          <div className="raj-loader__sun" />
          <div className="raj-loader__fort">
            <span />
            <span />
            <span />
          </div>
          <div className="raj-loader__arch" />
        </div>
        <div className="font-serif font-semibold" style={{ fontSize: 15, color: 'var(--maroon)' }}>
          {label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1.4px', textTransform: 'uppercase' }}>
          Rajasthan Tourism
        </div>
      </div>
    </div>
  )
}
