export type AuthUserRole = "user" | "admin"

export type AuthUser = {
  id: string
  name: string
  email: string
  role: AuthUserRole
  isEmailVerified: boolean
  createdAt?: string
  updatedAt?: string
}

export type AuthToken = {
  token: string
  expires: string
}

export type AuthTokens = {
  access: AuthToken
  refresh: AuthToken
}

export type AuthSession = {
  user: AuthUser | null
  tokens: AuthTokens
}

export type VerificationRedirectSession = {
  tokens: AuthTokens
  verified: boolean
}

const sessionStorageKey = "pm.auth.session"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

function isAuthToken(value: unknown): value is AuthToken {
  return (
    isRecord(value) &&
    isString(value.token) &&
    isString(value.expires)
  )
}

function isAuthTokens(value: unknown): value is AuthTokens {
  return (
    isRecord(value) &&
    isAuthToken(value.access) &&
    isAuthToken(value.refresh)
  )
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.email) &&
    (value.role === "user" || value.role === "admin") &&
    isBoolean(value.isEmailVerified)
  )
}

function isAuthSession(value: unknown): value is AuthSession {
  return (
    isRecord(value) &&
    (value.user === null || isAuthUser(value.user)) &&
    isAuthTokens(value.tokens)
  )
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null
  }

  const rawSession = window.localStorage.getItem(sessionStorageKey)
  if (!rawSession) {
    return null
  }

  try {
    const parsedSession: unknown = JSON.parse(rawSession)
    return isAuthSession(parsedSession) ? parsedSession : null
  } catch {
    return null
  }
}

export function writeStoredSession(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return
  }

  if (!session) {
    window.localStorage.removeItem(sessionStorageKey)
    return
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(sessionStorageKey)
}

export function consumeVerificationRedirectSession(
  hash = typeof window === "undefined" ? "" : window.location.hash
): VerificationRedirectSession | null {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash
  if (!normalizedHash) {
    return null
  }

  const hashParams = new URLSearchParams(normalizedHash)
  const accessToken = hashParams.get("accessToken")
  const refreshToken = hashParams.get("refreshToken")
  const accessExpires = hashParams.get("accessExpires")
  const refreshExpires = hashParams.get("refreshExpires")

  if (!accessToken || !refreshToken || !accessExpires || !refreshExpires) {
    return null
  }

  return {
    tokens: {
      access: {
        token: accessToken,
        expires: accessExpires,
      },
      refresh: {
        token: refreshToken,
        expires: refreshExpires,
      },
    },
    verified: hashParams.get("verified") === "true",
  }
}

export function clearVerificationRedirectHash() {
  if (typeof window === "undefined" || !window.location.hash) {
    return
  }

  const nextUrl = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, "", nextUrl)
}