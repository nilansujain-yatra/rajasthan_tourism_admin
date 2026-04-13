'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { MapPin } from 'lucide-react'

const DRIVERS = [
  { id:'DR-101', name:'Ramesh Meena',   phone:'98290-11234', vehicle:'RJ-14-CA-1234', zone:'Jaipur',      status:'Active',    trips:8,  rating:4.8 },
  { id:'DR-102', name:'Suresh Verma',   phone:'93149-55678', vehicle:'RJ-20-GA-5678', zone:'Jodhpur',     status:'Active',    trips:6,  rating:4.6 },
  { id:'DR-103', name:'Dinesh Kumar',   phone:'94143-99012', vehicle:'RJ-45-AB-9012', zone:'Jaisalmer',   status:'On Trip',   trips:10, rating:4.9 },
  { id:'DR-104', name:'Mohan Lal',      phone:'77270-33456', vehicle:'RJ-13-CC-3456', zone:'Chittorgarh', status:'Inactive',  trips:3,  rating:4.2 },
  { id:'DR-105', name:'Bharat Singh',   phone:'90016-77890', vehicle:'RJ-02-DC-7890', zone:'Jaipur',      status:'Active',    trips:5,  rating:4.7 },
]

const statusColor: Record<string, { bg:string; color:string }> = {
  'Active':   { bg:'rgba(26,122,110,0.1)',  color:'#1A7A6E' },
  'On Trip':  { bg:'rgba(200,146,42,0.12)', color:'#C8922A' },
  'Inactive': { bg:'rgba(154,122,90,0.1)',  color:'#9A7A5A' },
}

export default function DriversPage() {
  return (
    <div className="flex min-h-screen" style={{ background:'var(--cream)' }}>
      <Sidebar /><div className="flex flex-col flex-1 min-w-0"><Topbar />
      <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Total Drivers',  val:'24', color:'var(--maroon)' },
            { label:'Active Now',     val:'18', color:'#1A7A6E'       },
            { label:'On Trip',        val:'6',  color:'#C8922A'       },
            { label:'Avg. Rating',    val:'4.6★', color:'var(--gold)' },
          ].map(s=>(
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <SectionHeader title="Driver Registry" />
        <div className="rounded-xl3 overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                {['Driver ID','Name','Phone','Vehicle','Zone','Trips Today','Rating','Status','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DRIVERS.map((d,i)=>{
                const sc = statusColor[d.status]
                return (
                  <tr key={d.id} style={{ borderBottom:i<DRIVERS.length-1?'1px solid var(--cream-dark)':'none' }}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='var(--cream)')}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='')}>
                    <td className="px-4 py-3 font-medium" style={{ fontSize:12, color:'var(--maroon)' }}>{d.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center rounded-full text-white font-semibold" style={{ width:28, height:28, background:'var(--teal)', fontSize:10, flexShrink:0 }}>
                          {d.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                        </div>
                        <span className="font-medium" style={{ fontSize:12 }}>{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{d.phone}</td>
                    <td className="px-4 py-3 font-medium" style={{ fontSize:11 }}>{d.vehicle}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" style={{ fontSize:11, color:'var(--text-mid)' }}>
                        <MapPin size={11} /> {d.zone}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ fontSize:13, color:'var(--maroon)' }}>{d.trips}</td>
                    <td className="px-4 py-3" style={{ fontSize:11, color:'#C8922A' }}>★ {d.rating}</td>
                    <td className="px-4 py-3"><span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...sc }}>{d.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button style={{ fontSize:11, color:'var(--maroon)', fontWeight:500 }}>Track</button>
                        <button style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>Edit</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
      </div>
    </div>
  )
}
