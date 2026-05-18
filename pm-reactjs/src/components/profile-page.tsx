import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { api, getApiErrorMessage } from "@/lib/api"
import { profileSchema } from "@/lib/auth-schemas"
import type { AuthUser } from "@/lib/session"

type ProfileValues = z.infer<typeof profileSchema>
type UpdateProfilePayload = {
  name?: string
  email?: string
  password?: string
}

function buildProfilePayload(
  currentUser: AuthUser,
  values: ProfileValues
): UpdateProfilePayload {
  const nextName = values.name.trim()
  const nextEmail = values.email.trim()
  const payload: UpdateProfilePayload = {}

  if (nextName !== currentUser.name) {
    payload.name = nextName
  }

  if (nextEmail !== currentUser.email) {
    payload.email = nextEmail
  }

  if (values.password.length > 0) {
    payload.password = values.password
  }

  return payload
}

export function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clearSession, logout, tokens, updateUser, user } = useAuth()

  const updateUserRef = React.useRef(updateUser)
  const lastSyncedSignatureRef = React.useRef<string>("")

  React.useEffect(() => {
    updateUserRef.current = updateUser
  }, [updateUser])

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      confirmPassword: "",
    },
  })

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    initialData: user ?? undefined,
    // staleTime: 30_000,
    queryFn: async () => {
      const response = await api.get<AuthUser>(`/users/${user!.id}`)
      return response.data
    },
  })

  React.useEffect(() => {
    const nextUser = profileQuery.data
    if (!nextUser) {
      return
    }

    const nextSignature = JSON.stringify({
      id: nextUser.id,
      name: nextUser.name,
      email: nextUser.email,
      role: nextUser.role,
      isEmailVerified: nextUser.isEmailVerified,
    })

    if (nextSignature === lastSyncedSignatureRef.current) {
      return
    }

    lastSyncedSignatureRef.current = nextSignature
    updateUserRef.current(nextUser)
    form.reset({
      name: nextUser.name,
      email: nextUser.email,
      password: "",
      confirmPassword: "",
    })
  }, [form, profileQuery.data])

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const response = await api.patch<AuthUser>(`/users/${user!.id}`, payload)
      return response.data
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["profile", updatedUser.id], updatedUser)
      updateUser(updatedUser)
      form.reset({
        name: updatedUser.name,
        email: updatedUser.email,
        password: "",
        confirmPassword: "",
      })
      toast.success("Profile updated.")
    },
    onError: (error) => {
      form.setError("root", {
        message: getApiErrorMessage(error),
      })
    },
  })

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      await api.post("/auth/send-verification-email")
    },
    onSuccess: () => {
      toast.success(
        "Verification email sent. Check MailDev or your configured inbox."
      )
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/users/${user!.id}`)
    },
    onSuccess: () => {
      toast.success("Account deleted.")
      clearSession()
      navigate("/login", { replace: true })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  const activeUser = profileQuery.data ?? user

  if (!activeUser || !tokens) {
    return null
  }

  const onSubmit = form.handleSubmit((values) => {
    const payload = buildProfilePayload(activeUser, values)

    if (!Object.keys(payload).length) {
      form.setError("root", {
        message: "Make a change before saving your profile.",
      })
      return
    }

    updateProfileMutation.mutate(payload)
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account details, verification status, and session from
            the frontend while keeping the existing backend as the source of
            truth.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={activeUser.isEmailVerified ? "default" : "secondary"}>
            {activeUser.isEmailVerified
              ? "Verified email"
              : "Verification pending"}
          </Badge>
          <Badge variant="outline">{activeUser.role}</Badge>
          {profileQuery.isFetching ? (
            <span className="text-xs text-muted-foreground">
              Refreshing profile...
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              Update the fields supported by PATCH /users/:userId. Only modified
              values are sent to the backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-6" onSubmit={onSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(form.formState.errors.name)}>
                  <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                  <Input id="profile-name" {...form.register("name")} />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.email)}>
                  <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                  <Input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                  />
                  <FieldDescription>
                    Changing your email may require a fresh verification email.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.email]} />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field data-invalid={Boolean(form.formState.errors.password)}>
                    <FieldLabel htmlFor="profile-password">
                      New password
                    </FieldLabel>
                    <Input
                      id="profile-password"
                      type="password"
                      autoComplete="new-password"
                      {...form.register("password")}
                    />
                    <FieldDescription>
                      Leave blank if you are not rotating credentials.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.password]} />
                  </Field>

                  <Field
                    data-invalid={Boolean(
                      form.formState.errors.confirmPassword
                    )}
                  >
                    <FieldLabel htmlFor="profile-confirm-password">
                      Confirm password
                    </FieldLabel>
                    <Input
                      id="profile-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      {...form.register("confirmPassword")}
                    />
                    <FieldError
                      errors={[form.formState.errors.confirmPassword]}
                    />
                  </Field>
                </div>

                <Field>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={updateProfileMutation.isPending}
                      type="submit"
                    >
                      {updateProfileMutation.isPending
                        ? "Saving..."
                        : "Save changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset({
                          name: activeUser.name,
                          email: activeUser.email,
                          password: "",
                          confirmPassword: "",
                        })
                      }}
                    >
                      Reset form
                    </Button>
                  </div>
                  <FieldError errors={[form.formState.errors.root]} />
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Email verification</CardTitle>
              <CardDescription>
                Verification is still handled by the backend redirect flow. This
                page exposes the resend action directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                {activeUser.isEmailVerified
                  ? "This email address is already verified."
                  : "This account is signed in but still waiting for email verification."}
              </div>
              {!activeUser.isEmailVerified ? (
                <Button
                  disabled={resendVerificationMutation.isPending}
                  onClick={() => resendVerificationMutation.mutate()}
                  type="button"
                >
                  {resendVerificationMutation.isPending
                    ? "Sending..."
                    : "Resend verification email"}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
              <CardDescription>
                Current user metadata and shortcuts for the protected workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span>User id</span>
                  <span className="font-mono text-xs text-foreground">
                    {activeUser.id}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Access token</span>
                  <span className="text-foreground">
                    {new Date(tokens.access.expires).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Refresh token</span>
                  <span className="text-foreground">
                    {new Date(tokens.refresh.expires).toLocaleString()}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to="/dashboard">Open dashboard</Link>
                </Button>
                <Button onClick={() => void logout()} type="button">
                  Log out
                </Button>
              </div>
              {profileQuery.isError ? (
                <p className="text-destructive">
                  {getApiErrorMessage(profileQuery.error)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Permanently delete this account from the backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This removes the current user and clears the client session.
              </p>
              <Button
                disabled={deleteAccountMutation.isPending}
                variant="destructive"
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this account permanently? This action cannot be undone."
                    )
                  ) {
                    deleteAccountMutation.mutate()
                  }
                }}
              >
                {deleteAccountMutation.isPending
                  ? "Deleting..."
                  : "Delete account"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
