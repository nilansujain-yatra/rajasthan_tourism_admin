'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { MENU_ITEMS, ROLES, USERS } from '@/app/operations/menu/menu-data'

export default function MenuPage() {
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')

  const [selectedMenus, setSelectedMenus] = useState<string[]>([])
  const [selectedSubMenus, setSelectedSubMenus] = useState<string[]>([])

  // Filter users based on role
  const filteredUsers =
    selectedRole === 'all'
      ? USERS
      : USERS.filter(u => u.roleId === selectedRole || u.id === 'all')

  // Handle menu toggle
  const toggleMenu = (menuId: string, childrenIds: string[]) => {
    const isSelected = selectedMenus.includes(menuId)

    if (isSelected) {
      setSelectedMenus(prev => prev.filter(id => id !== menuId))
      setSelectedSubMenus(prev =>
        prev.filter(id => !childrenIds.includes(id))
      )
    } else {
      setSelectedMenus(prev => [...prev, menuId])
      setSelectedSubMenus(prev => {
        const combined = [...prev]

        childrenIds.forEach(id => {
          if (!combined.includes(id)) {
            combined.push(id)
          }
        })

        return combined
      })    }
  }

  // Handle submenu toggle
  const toggleSubMenu = (menuId: string, subId: string, childrenIds: string[]) => {
    const isSelected = selectedSubMenus.includes(subId)

    let updatedSubMenus = isSelected
      ? selectedSubMenus.filter(id => id !== subId)
      : [...selectedSubMenus, subId]

    setSelectedSubMenus(updatedSubMenus)

    // update parent menu
    const allSelected = childrenIds.every(id =>
      updatedSubMenus.includes(id)
    )

    if (allSelected) {
      setSelectedMenus(prev => {
        if (prev.includes(menuId)) return prev
        return [...prev, menuId]
      })    } else {
      setSelectedMenus(prev => prev.filter(id => id !== menuId))
    }
  }

  const handleSubmit = () => {
    const payload = {
      role: selectedRole,
      user: selectedUser,
      menus: selectedMenus,
      subMenus: selectedSubMenus,
    }

    console.log('SUBMIT DATA:', payload)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />

        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          <SectionHeader title="Menu Management" />

          {/* Filters */}
          <div className="flex gap-3 items-end">
            <div>
              <div style={{ fontSize: 11 }}>Role</div>
              <select
                value={selectedRole}
                onChange={e => {
                  setSelectedRole(e.target.value)
                  setSelectedUser('all')
                }}
                className="px-3 py-2 rounded-lg"
              >
                {ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 11 }}>User</div>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="px-3 py-2 rounded-lg"
              >
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg"
              style={{ background: 'var(--maroon)', color: '#fff', fontSize: 12 }}
            >
              Apply Filter
            </button>
          </div>

          {/* Menu Sections */}
          <div className="flex flex-col gap-4">
            {MENU_ITEMS.map(section => {
              const childIds = section.children?.map(c => c.id) || []
              const isMenuSelected = selectedMenus.includes(section.id)

              return (
                <div
                  key={section.id}
                  className="rounded-xl p-4"
                  style={{ background: '#fff', border: '1px solid var(--sand)' }}
                >
                  {/* Menu Checkbox */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={isMenuSelected}
                      onChange={() => toggleMenu(section.id, childIds)}
                    />
                    <div className="font-semibold" style={{ fontSize: 14 }}>
                      {section.label}
                    </div>
                  </div>

                  {/* Submenus */}
                  <div className="grid grid-cols-2 gap-2">
                    {section.children?.map(item => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'var(--cream)', fontSize: 12 }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubMenus.includes(item.id)}
                          onChange={() =>
                            toggleSubMenu(section.id, item.id, childIds)
                          }
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Submit */}
          <div>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 rounded-lg"
              style={{
                background: 'var(--maroon)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              Submit Permissions
            </button>
          </div>

        </main>
      </div>
    </div>
  )
}