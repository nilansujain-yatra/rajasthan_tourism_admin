'use client'

import PlaceCard from '@/components/ui/PlaceCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { Plus, Search, Filter } from 'lucide-react'

const PLACES = [
  { name: 'Amber Fort',        emoji: '🏯', visitors: '2,500', trend: '2,500', category: 'Fort & Palace',     status: 'live'    as const },
  { name: 'Jantar Mantar B',   emoji: '🌌', visitors: '2,500', trend: '1,500', category: 'Observatory',       status: 'live'    as const },
  { name: 'Jantar Mantar',     emoji: '⚗️',  visitors: '2,500', trend: '1,500', category: 'Observatory',       status: 'live'    as const },
  { name: 'Nahargarh Fort',    emoji: '🏰', visitors: '1,500', trend: '1,500', category: 'Fort & Palace',     status: 'live'    as const },
  { name: 'Jaisalmer Fort',    emoji: '🏜️',  visitors: '1,500', trend: '1,500', category: 'Fort & Palace',     status: 'live'    as const },
  { name: 'Chittorgarh Fort',  emoji: '⚔️',  visitors: '2,200', trend: '1,000', category: 'Fort & Palace',     status: 'live'    as const },
  { name: 'Mehrangarh Fort',   emoji: '🗼', visitors: '2,500', trend: '1,500', category: 'Fort & Palace',     status: 'live'    as const },
  { name: 'Albert Hall Museum',emoji: '🏛️', visitors: '2,500', trend: '1,500', category: 'Museum',            status: 'live'    as const },
  { name: 'Gagron Fort',       emoji: '🌊', visitors: '2,500', trend: '1,500', category: 'UNESCO World Heritage',status:'live'   as const },
  { name: 'Ranthambore Fort',  emoji: '🦁', visitors: '980',   trend: '980',   category: 'Fort & Wildlife',   status: 'pending' as const },
  { name: 'Kumbhalgarh Fort',  emoji: '🛡️',  visitors: '1,200', trend: '800',   category: 'Fort & Palace',     status: 'live'    as const },
  { name: 'Hawa Mahal',        emoji: '🪟', visitors: '3,100', trend: '2,200', category: 'Palace',            status: 'live'    as const },
]

export default function PlacesPage() {
  return (
    <div className="px-6 py-6 space-y-6">

      {/* Top actions bar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 max-w-xs rounded-xl px-3 py-2"
          style={{ background: '#fff', border: '1px solid var(--sand)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search sites..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 12, color: 'var(--text-dark)' }}
          />
        </div>

        {/* Filter chips */}
        {['All', 'Fort', 'Museum', 'Observatory', 'UNESCO'].map((f, i) => (
          <button
            key={f}
            className="rounded-full px-3 py-1 font-medium transition-colors"
            style={{
              fontSize: 11,
              background: i === 0 ? 'var(--maroon)' : 'var(--cream-dark)',
              color: i === 0 ? '#fff' : 'var(--text-mid)',
              border: `1px solid ${i === 0 ? 'var(--maroon)' : 'var(--sand)'}`,
            }}
          >
            {f}
          </button>
        ))}

        <div className="flex-1" />

        {/* Add new site button */}
        <button
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-white font-medium"
          style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', fontSize: 12, color: 'var(--text-dark)' }}
        >
          <Plus size={14} />
          Add New Site
        </button>
      </div>

      {/* Stats mini-row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Sites',    val: '10', icon: '🏛️', color: 'var(--maroon)' },
          { label: 'Live Now',       val: '10', icon: '🟢', color: 'var(--teal)'   },
          { label: 'Pending Review', val: '2',  icon: '⏳', color: 'var(--gold)'   },
          { label: 'Closed',         val: '0',  icon: '🔴', color: '#9A7A5A'       },
        ].map(s => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#fff', border: '1px solid var(--sand)' }}
          >
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 22, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sites grid */}
      <div>
        <SectionHeader
          title="Dept. of Archaeology · Live Sites"
          right={
            <span
              className="font-serif font-semibold"
              style={{ fontSize: 14, color: 'var(--text-muted)' }}
            >
              Total Live Sites: {PLACES.filter(p => p.status === 'live').length}
            </span>
          }
        />

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}
        >
          {PLACES.map(place => (
            <PlaceCard key={place.name} {...place} />
          ))}

          {/* Add new card */}
          <div
            className="rounded-xl3 flex flex-col items-center justify-center cursor-pointer transition-colors"
            style={{
              minHeight: 220,
              border: '1.5px dashed var(--sand-dark)',
              background: 'transparent',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--cream-dark)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <div style={{ fontSize: 30, color: 'var(--text-muted)', marginBottom: 8 }}>＋</div>
            <div className="font-medium" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add New Site</div>
          </div>
        </div>
      </div>
    </div>
  )
}
