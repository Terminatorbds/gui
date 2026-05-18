import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios"

import type { AuthTokens } from "@/lib/session"

type ApiErrorPayload = {
  code?: number
  message?: string
  stack?: string
}

type ApiAuthHandlers = {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  onTokensRefreshed: (tokens: AuthTokens) => void
  onUnauthorized: () => void
}

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const refreshBypassPaths = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-tokens",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
]

let authHandlers: ApiAuthHandlers | null = null
let refreshPromise: Promise<AuthTokens | null> | null = null

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/v1"

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
})

function shouldBypassRefresh(url?: string) {
  return !url || refreshBypassPaths.some((path) => url.includes(path))
}

function setAuthorizationHeader(
  config: Pick<InternalAxiosRequestConfig, "headers">,
  accessToken: string
) {
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers)

  headers.set("Authorization", `Bearer ${accessToken}`)
  config.headers = headers
}

async function requestTokenRefresh(): Promise<AuthTokens | null> {
  if (!authHandlers) {
    return null
  }

  const refreshToken = authHandlers.getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    const response = await axios.post<AuthTokens>(
      `${apiBaseUrl}/auth/refresh-tokens`,
      { refreshToken }
    )

    authHandlers.onTokensRefreshed(response.data)
    return response.data
  } catch {
    authHandlers.onUnauthorized()
    return null
  }
}

async function getRefreshedTokens() {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

api.interceptors.request.use((config) => {
  const accessToken = authHandlers?.getAccessToken()
  if (accessToken) {
    setAuthorizationHeader(config, accessToken)
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const request = error.config as RetryableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      shouldBypassRefresh(request.url)
    ) {
      return Promise.reject(error)
    }

    const refreshedTokens = await getRefreshedTokens()
    if (!refreshedTokens) {
      return Promise.reject(error)
    }

    request._retry = true
    setAuthorizationHeader(request, refreshedTokens.access.token)
    return api(request)
  }
)

export function configureApiAuth(handlers: ApiAuthHandlers | null) {
  authHandlers = handlers
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = "Something went wrong"
) {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage
  }

  return fallbackMessage
}