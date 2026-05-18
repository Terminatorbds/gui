"use client"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ChartBarIcon,
  CircleHelpIcon,
  CommandIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  LayoutDashboardIcon,
  MailIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <LayoutDashboardIcon
        />
      ),
    },
    {
      title: "Profile",
      url: "/profile",
      icon: (
        <UserRoundIcon
        />
      ),
    },
    {
      title: "API Docs",
      url: "http://localhost:3000/v1/docs",
      icon: (
        <ShieldCheckIcon
        />
      ),
    },
    {
      title: "Analytics",
      url: "/dashboard",
      icon: (
        <ChartBarIcon
        />
      ),
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/profile",
      icon: (
        <Settings2Icon
        />
      ),
    },
    {
      title: "MailDev",
      url: "http://localhost:1080",
      icon: (
        <MailIcon
        />
      ),
    },
    {
      title: "Get Help",
      url: "http://localhost:3000/v1/docs",
      icon: (
        <CircleHelpIcon
        />
      ),
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "/dashboard",
      icon: (
        <DatabaseIcon
        />
      ),
    },
    {
      name: "Reports",
      url: "http://localhost:3000/v1/docs",
      icon: (
        <FileChartColumnIcon
        />
      ),
    },
    {
      name: "Mail Inbox",
      url: "http://localhost:1080",
      icon: (
        <MailIcon
        />
      ),
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar?: string
  }
  onLogout?: () => void | Promise<void>
}

export function AppSidebar({ user, onLogout, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">Predictive Maintenance</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser onLogout={onLogout} profileUrl="/profile" user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
