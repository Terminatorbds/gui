import dashboardData from "@/app/dashboard/data.json"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/components/auth-provider"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function DashboardPage() {
  const { logout, user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
        }}
        onLogout={() => void logout()}
      />
      <SidebarInset>
        <SiteHeader
          title="Operations dashboard"
          description="Protected dashboard shell generated with shadcn and wired into the existing auth/session flow."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={user.isEmailVerified ? "default" : "secondary"}>
                {user.isEmailVerified ? "Verified" : "Needs verification"}
              </Badge>
              <Badge variant="outline">{user.role}</Badge>
            </div>
          }
        />

        <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Authenticated workspace</CardTitle>
                <CardDescription>
                  The generated dashboard block is now behind the real route guard,
                  using the active backend session and current operator details.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Signed in as</span>
                  <span className="font-medium text-foreground">{user.name}</span>
                  <span>({user.email})</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <a href="/profile">Open profile</a>
                  </Button>
                  <Button onClick={() => void logout()} type="button">
                    Log out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration status</CardTitle>
                <CardDescription>
                  The shell is live; the generated KPI cards and table still use the
                  sample dataset shipped with dashboard-01.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border border-dashed px-4 py-3">
                  Frontend auth uses login, register, refresh, verification, forgot,
                  and reset flows from the existing backend contract.
                </div>
                <div className="rounded-lg border border-dashed px-4 py-3">
                  Dashboard analytics remain demo values until machine and anomaly
                  endpoints are exposed by the backend.
                </div>
              </CardContent>
            </Card>
          </div>

          <SectionCards />

          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>

          <DataTable data={dashboardData} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}