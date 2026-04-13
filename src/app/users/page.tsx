import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { Search, UserPlus } from 'lucide-react'

const USERS = [
  { name: 'BHARATTAILOR1408',  email: 'bharat@raj.gov.in',   role: 'Operator',       site: 'Amber Fort',       status: 'Active',   last: '01 Apr 2026' },
  { name: 'Gurjarpankaj394',   email: 'pankaj@raj.gov.in',   role: 'Dept. Admin',    site: 'All Sites',        status: 'Active',   last: '01 Apr 2026' },
  { name: 'SANJAYJADONSIR',    email: 'sanjay@raj.gov.in',   role: 'Super Admin',    site: 'All Sites',        status: 'Active',   last: '01 Apr 2026' },
  { name: 'ramesh.operator',   email: 'ramesh@raj.gov.in',   role: 'Operator',       site: 'Jantar Mantar',    status: 'Active',   last: '31 Mar 2026' },
  { name: 'priya.counter',     email: 'priya@raj.gov.in',    role: 'Counter Staff',  site: 'Mehrangarh Fort',  status: 'Inactive', last: '28 Mar 2026' },
  { name: 'mohit.kiosk',       email: 'mohit@raj.gov.in',    role: 'Kiosk Staff',    site: 'Jaisalmer Fort',   status: 'Active',   last: '01 Apr 2026' },
]

const roleColor: Record<string, { bg: string; color: string }> = {
  'Super Admin':    { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
  'Dept. Admin':    { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
  'Operator':       { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
  'Counter Staff':  { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
  'Kiosk Staff':    { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
}

export default function UsersPage() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'Total Users',   val:'24', color:'var(--maroon)' },
              { label:'Active',        val:'21', color:'#1A7A6E' },
              { label:'Admins',        val:'3',  color:'#C8922A' },
              { label:'Inactive',      val:'3',  color:'#9A7A5A' },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm rounded-xl px-3 py-2" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <Search size={14} style={{ color:'var(--text-muted)' }} />
              <input placeholder="Search users..." className="flex-1 bg-transparent outline-none" style={{ fontSize:12 }} />
            </div>
            <div className="flex-1" />
            <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-white font-medium" style={{ fontSize:12, background:'var(--maroon)' }}>
              <UserPlus size={13} />
              Add User
            </button>
          </div>

          <div>
            <SectionHeader title="All Users" />
            <div className="rounded-xl3 overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                    {['User','Email','Role','Assigned Site','Status','Last Login','Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {USERS.map((u, i) => {
                    const rc = roleColor[u.role] ?? { bg:'transparent', color:'inherit' }
                    return (
                      <tr key={u.name} style={{ borderBottom: i < USERS.length-1 ? '1px solid var(--cream-dark)' : 'none' }}
                        onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='var(--cream)')}
                        onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='')}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center rounded-full text-white font-semibold" style={{ width:28, height:28, background:'var(--maroon)', fontSize:10 }}>
                              {u.name.slice(0,2).toUpperCase()}
                            </div>
                            <span className="font-medium" style={{ fontSize:12 }}>{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...rc }}>{u.role}</span>
                        </td>
                        <td className="px-5 py-3 font-serif font-semibold" style={{ fontSize:13 }}>{u.site}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{
                            fontSize:10,
                            background: u.status==='Active' ? 'rgba(26,122,110,0.1)' : 'rgba(154,122,90,0.1)',
                            color: u.status==='Active' ? '#1A7A6E' : '#9A7A5A',
                          }}>{u.status}</span>
                        </td>
                        <td className="px-5 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{u.last}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <button style={{ fontSize:11, color:'var(--maroon)', fontWeight:500 }}>Edit</button>
                            <button style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>Disable</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
