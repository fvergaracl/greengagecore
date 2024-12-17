import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (arg: boolean) => void
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const router = useRouter()
  const trigger = useRef<any>(null)
  const sidebar = useRef<any>(null)

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded")
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true"
  )

  // Submenu states
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu)
  }

  // Close sidebar on outside click
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return
      setSidebarOpen(false)
    }
    document.addEventListener("click", clickHandler)
    return () => document.removeEventListener("click", clickHandler)
  }, [sidebarOpen])

  // Close sidebar on Esc key press
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return
      setSidebarOpen(false)
    }
    document.addEventListener("keydown", keyHandler)
    return () => document.removeEventListener("keydown", keyHandler)
  }, [sidebarOpen])

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded.toString())
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded")
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded")
    }
  }, [sidebarExpanded])

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Sidebar Header */}
      <div className='flex items-center justify-between px-6 py-5.5'>
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls='sidebar'
          aria-expanded={sidebarOpen}
          className='block lg:hidden'
        >
          <span className='text-white'>Close</span>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className='no-scrollbar flex flex-col overflow-y-auto'>
        <nav className='mt-5 py-4 px-4'>
          {/* Menu Group */}
          <div>
            <h3 className='mb-4 ml-4 text-sm font-semibold text-gray-500'>
              MENU
            </h3>
            <ul className='mb-6 flex flex-col gap-1.5'>
              {/* Home */}
              <li>
                <button
                  onClick={() => router.push("/admin")}
                  className='group flex w-full items-center rounded-sm px-4 py-2 font-medium text-white hover:bg-gray-700'
                >
                  Home
                </button>
              </li>
              {/* Campaigns */}
              <li>
                <button
                  onClick={() => toggleMenu("campaigns")}
                  className='group flex w-full items-center justify-between rounded-sm px-4 py-2 font-medium text-white hover:bg-gray-700'
                >
                  <span>Campaigns</span>
                  <span>{openMenu === "campaigns" ? "▼" : "▶"}</span>
                </button>
                {openMenu === "campaigns" && (
                  <ul className='ml-6 mt-1 space-y-1'>
                    <li>
                      <button
                        onClick={() => router.push("/admin/campaigns")}
                        className='block w-full rounded-sm px-4 py-1 text-left text-sm text-gray-300 hover:bg-gray-600'
                      >
                        All Campaigns
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => router.push("/admin/campaigns/create")}
                        className='block w-full rounded-sm px-4 py-1 text-left text-sm text-gray-300 hover:bg-gray-600'
                      >
                        Create New
                      </button>
                    </li>
                  </ul>
                )}
              </li>

              {/* Users */}
              <li>
                <button
                  onClick={() => router.push("/admin/users")}
                  className='group flex w-full items-center rounded-sm px-4 py-2 font-medium text-white hover:bg-gray-700'
                >
                  Users
                </button>
              </li>

              {/* Activity Logs */}
              <li>
                <button
                  onClick={() => router.push("/admin/activity-logs")}
                  className='group flex w-full items-center rounded-sm px-4 py-2 font-medium text-white hover:bg-gray-700'
                >
                  Activity Logs
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
