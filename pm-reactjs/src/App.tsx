import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"

import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from "@/components/auth-pages"
import { useAuth } from "@/components/auth-provider"
import { DashboardPage } from "@/components/dashboard-page"
import { ProfilePage } from "@/components/profile-page"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

function HomeRedirect() {
  const { isAuthenticated, status } = useAuth()

  if (status === "loading") {
    return <LoadingRoute />
  }

  return <Navigate replace to={isAuthenticated ? "/dashboard" : "/login"} />
}

function ProtectedRoute() {
  const { isAuthenticated, status } = useAuth()
  const location = useLocation()

  if (status === "loading") {
    return <LoadingRoute />
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  return <Outlet />
}

function GuestRoute() {
  const { isAuthenticated, status } = useAuth()

  if (status === "loading") {
    return <LoadingRoute />
  }

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />
  }

  return <Outlet />
}

function LoadingRoute() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-5 py-4 text-sm text-muted-foreground shadow-sm">
        <span className="size-2 rounded-full bg-emerald-500" />
        Restoring the current session...
      </div>
    </div>
  )
}
