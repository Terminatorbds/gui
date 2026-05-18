/* eslint-disable react-refresh/only-export-components */

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { jwtDecode } from "jwt-decode"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { api, apiBaseUrl, configureApiAuth, getApiErrorMessage } from "@/lib/api"
import {
  clearStoredSession,
  clearVerificationRedirectHash,
  consumeVerificationRedirectSession,
  readStoredSession,
  writeStoredSession,
  type AuthSession,
  type AuthTokens,
  type AuthUser,
} from "@/lib/session"

type AuthStatus = "loading" | "authenticated" | "guest"

type HydratedAuthSession = {
  user: AuthUser
  tokens: AuthTokens
}

type AuthContextValue = {
  status: AuthStatus
  isAuthenticated: boolean
  session: AuthSession | null
  user: AuthUser | null
  tokens: AuthTokens | null
  setAuthenticatedSession: (session: HydratedAuthSession) => void
  updateUser: (user: AuthUser) => void
  clearSession: () => void
  logout: () => Promise<void>
}

type AccessTokenPayload = {
  sub?: string
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

function getUserIdFromAccessToken(accessToken: string) {
  const payload = jwtDecode<AccessTokenPayload>(accessToken)
  if (!payload.sub) {
    throw new Error("Access token is missing the user id.")
  }

  return payload.sub
}

async function fetchCurrentUser(tokens: AuthTokens) {
  const userId = getUserIdFromAccessToken(tokens.access.token)

  const response = await axios.get<AuthUser>(`${apiBaseUrl}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${tokens.access.token}`,
    },
  })

  return response.data
}

async function requestRefreshedTokens(refreshToken: string) {
  const response = await axios.post<AuthTokens>(
    `${apiBaseUrl}/auth/refresh-tokens`,
    { refreshToken }
  )

  return response.data
}

async function loadFreshSession(tokens: AuthTokens): Promise<HydratedAuthSession> {
  try {
    const user = await fetchCurrentUser(tokens)
    return { user, tokens }
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      throw error
    }

    const refreshedTokens = await requestRefreshedTokens(tokens.refresh.token)
    const user = await fetchCurrentUser(refreshedTokens)

    return {
      user,
      tokens: refreshedTokens,
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [session, setSessionState] = React.useState<AuthSession | null>(
    () => readStoredSession()
  )
  const [status, setStatus] = React.useState<AuthStatus>("loading")

  const sessionRef = React.useRef<AuthSession | null>(session)
  const bootstrapRef = React.useRef(false)

  React.useEffect(() => {
    sessionRef.current = session
  }, [session])

  const persistSession = React.useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession
    setSessionState(nextSession)

    if (nextSession) {
      writeStoredSession(nextSession)
      return
    }

    clearStoredSession()
    queryClient.clear()
  }, [queryClient])

  React.useEffect(() => {
    configureApiAuth({
      getAccessToken: () => sessionRef.current?.tokens.access.token ?? null,
      getRefreshToken: () => sessionRef.current?.tokens.refresh.token ?? null,
      onTokensRefreshed: (tokens) => {
        const currentSession = sessionRef.current
        if (!currentSession?.user) {
          return
        }

        persistSession({
          ...currentSession,
          tokens,
        })
      },
      onUnauthorized: () => {
        persistSession(null)
        setStatus("guest")
        toast.error("Your session has expired. Please sign in again.", {
          id: "auth-session-expired",
        })

        if (location.pathname !== "/login") {
          navigate("/login", { replace: true })
        }
      },
    })

    return () => configureApiAuth(null)
  }, [location.pathname, navigate, persistSession])

  React.useEffect(() => {
    if (bootstrapRef.current) {
      return
    }

    bootstrapRef.current = true

    let isCancelled = false

    const bootstrapSession = async () => {
      const storedSession = readStoredSession()
      const redirectSession = consumeVerificationRedirectSession()

      if (redirectSession) {
        clearVerificationRedirectHash()
      }

      const tokens = redirectSession?.tokens ?? storedSession?.tokens ?? null
      const storedUser = redirectSession?.verified
        ? null
        : storedSession?.user ?? null

      if (!tokens) {
        if (!isCancelled) {
          persistSession(null)
          setStatus("guest")
        }

        return
      }

      if (storedUser) {
        if (!isCancelled) {
          persistSession({
            user: storedUser,
            tokens,
          })
          setStatus("authenticated")
        }

        return
      }

      try {
        const nextSession = await loadFreshSession(tokens)

        if (isCancelled) {
          return
        }

        persistSession(nextSession)
        setStatus("authenticated")

        if (redirectSession?.verified) {
          toast.success("Email verified successfully.", {
            id: "auth-email-verified",
          })
        }
      } catch (error) {
        if (isCancelled) {
          return
        }

        persistSession(null)
        setStatus("guest")

        if (redirectSession) {
          toast.error(getApiErrorMessage(error), {
            id: "auth-email-verification-failed",
          })
        }
      }
    }

    void bootstrapSession()

    return () => {
      isCancelled = true
    }
  }, [persistSession])

  const setAuthenticatedSession = (nextSession: HydratedAuthSession) => {
    persistSession(nextSession)
    setStatus("authenticated")
  }

  const updateUser = (user: AuthUser) => {
    const currentSession = sessionRef.current
    if (!currentSession) {
      return
    }

    persistSession({
      ...currentSession,
      user,
    })
    setStatus("authenticated")
  }

  const clearSession = () => {
    persistSession(null)
    setStatus("guest")
  }

  const logout = async () => {
    const refreshToken = sessionRef.current?.tokens.refresh.token

    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken })
      }
    } catch {
      // The client session still needs to be cleared even if server cleanup fails.
    }

    persistSession(null)
    setStatus("guest")

    if (location.pathname !== "/login") {
      navigate("/login", { replace: true })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        isAuthenticated: status === "authenticated" && Boolean(session?.user),
        session,
        user: session?.user ?? null,
        tokens: session?.tokens ?? null,
        setAuthenticatedSession,
        updateUser,
        clearSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.")
  }

  return context
}