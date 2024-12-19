import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import {
  MdHome,
  MdCampaign,
  MdSubtitles,
  MdTask,
  MdArrowDropDown,
  MdArrowRight
} from "react-icons/md"
import { LuLogs } from "react-icons/lu"
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

  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu)
  }

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

  // Menu configuration
  const menu = [
    {
      title: "Home",
      icon: <MdHome size={20} />,
      route: "/admin"
    },
    {
      title: "Campaigns",
      icon: <MdCampaign size={20} />,
      submenu: [
        { title: "All Campaigns", route: "/admin/campaigns" },
        { title: "Create New", route: "/admin/campaigns/create" }
      ]
    },
    {
      title: "Areas",
      icon: <MdSubtitles size={20} />,
      submenu: [
        { title: "All Areas", route: "/admin/areas" },
        { title: "Create New", route: "/admin/areas/create" }
      ]
    },
    {
      title: "Tasks",
      icon: <MdTask size={20} />,
      submenu: [
        { title: "All Tasks", route: "/admin/tasks" },
        { title: "Create New", route: "/admin/tasks/create" }
      ]
    },
    {
      title: "Activity Log",
      icon: <LuLogs size={20} />,
      submenu: [
        { title: "Users", route: "/admin/activity-logs/users" },
        { title: "Systems", route: "/admin/activity-logs/systems" }
      ]
    }
  ]

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
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

      <div className='no-scrollbar flex flex-col overflow-y-auto'>
        <nav className='mt-5 py-4 px-4'>
          <ul className='mb-6 flex flex-col gap-1.5'>
            {menu.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() =>
                    item.submenu
                      ? toggleMenu(item.title)
                      : router.push(item.route)
                  }
                  className='group flex w-full items-center justify-between rounded-sm px-4 py-2 font-medium text-white hover:bg-gray-700'
                >
                  <div className='flex items-center gap-2'>
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  {item.submenu && (
                    <span>
                      {openMenu === item.title ? (
                        <MdArrowDropDown size={20} />
                      ) : (
                        <MdArrowRight size={20} />
                      )}
                    </span>
                  )}
                </button>
                {item.submenu && openMenu === item.title && (
                  <ul className='ml-6 mt-1 space-y-1'>
                    {item.submenu.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <button
                          onClick={() => router.push(subItem.route)}
                          className='block w-full rounded-sm px-4 py-1 text-left text-sm text-gray-300 hover:bg-gray-600'
                        >
                          {subItem.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
