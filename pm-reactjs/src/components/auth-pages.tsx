import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
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
import { api, getApiErrorMessage } from "@/lib/api"
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth-schemas"

type AuthShellProps = {
  title: string
  description: string
  children: React.ReactNode
}

function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/40 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_18%,transparent),transparent_45%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_80%,transparent),var(--background))]" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="space-y-3 text-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/80 px-4 py-1 text-xs font-semibold tracking-[0.24em] uppercase text-muted-foreground shadow-sm backdrop-blur"
          >
            Predictive Maintenance
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LoginPage() {
  return (
    <AuthShell
      title="Access the maintenance workspace"
      description="Sign in with the same credentials managed by the existing Node auth backend."
    >
      <LoginForm />
    </AuthShell>
  )
}

export function RegisterPage() {
  return (
    <AuthShell
      title="Create your operator account"
      description="Provision a user in the existing backend, then land directly inside the protected dashboard."
    >
      <SignupForm />
    </AuthShell>
  )
}

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.post("/auth/forgot-password", {
        email: values.email,
      })

      setSubmittedEmail(values.email)
      toast.success("Password reset email sent.")
    } catch (error) {
      form.setError("root", {
        message: getApiErrorMessage(error),
      })
    }
  })

  if (submittedEmail) {
    return (
      <AuthShell
        title="Check your inbox"
        description="If the address matches an account, the backend has issued a reset link using the existing token flow."
      >
        <Card>
          <CardHeader>
            <CardTitle>Reset link sent</CardTitle>
            <CardDescription>
              We sent reset instructions to {submittedEmail}. In local development,
              check MailDev at http://localhost:1080.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link to="/login">Back to login</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSubmittedEmail(null)
                form.reset()
              }}
            >
              Try a different email
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Request a backend reset token. The email message already points back to the frontend reset route."
    >
      <Card>
        <CardHeader>
          <CardTitle>Send reset email</CardTitle>
          <CardDescription>
            Enter the email tied to your account and we&apos;ll ask the backend to
            issue a reset token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
                <Input
                  id="forgot-password-email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  {...form.register("email")}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>

              <Field>
                <Button disabled={form.formState.isSubmitting} type="submit">
                  {form.formState.isSubmitting ? "Sending..." : "Send reset link"}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/login">Back to login</Link>
                </Button>
                <FieldError errors={[form.formState.errors.root]} />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.post(`/auth/reset-password?token=${encodeURIComponent(token)}`, {
        password: values.password,
      })

      toast.success("Password updated. Sign in with your new password.")
      navigate("/login", { replace: true })
    } catch (error) {
      form.setError("root", {
        message: getApiErrorMessage(error),
      })
    }
  })

  if (!token) {
    return (
      <AuthShell
        title="Reset link missing"
        description="The backend reset flow lands here with a ?token=... query string. This request cannot continue without it."
      >
        <Card>
          <CardHeader>
            <CardTitle>Invalid reset link</CardTitle>
            <CardDescription>
              Request a new email to generate a fresh reset token.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="This writes the new password through the backend token endpoint and then returns you to login."
    >
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter a new password for your account. The token from the email link is
            already attached to this request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.password)}>
                <FieldLabel htmlFor="reset-password">New password</FieldLabel>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("password")}
                />
                <FieldDescription>
                  Use at least 8 characters so the request satisfies the backend
                  validation contract.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.password]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
                <FieldLabel htmlFor="reset-confirm-password">
                  Confirm password
                </FieldLabel>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                />
                <FieldError errors={[form.formState.errors.confirmPassword]} />
              </Field>

              <Field>
                <Button disabled={form.formState.isSubmitting} type="submit">
                  {form.formState.isSubmitting ? "Updating..." : "Update password"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link to="/login">Back to login</Link>
                </Button>
                <FieldError errors={[form.formState.errors.root]} />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  )
}