import { z } from "zod"

import type { AuthTokens, AuthUser } from "@/lib/session"

export type AuthResponse = {
  user: AuthUser
  tokens: AuthTokens
}

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password must be 128 characters or fewer.")

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters long."),
    email: z.string().trim().email("Enter a valid email address."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      })
    }
  })

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      })
    }
  })

export const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters long."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    const hasPasswordInput =
      values.password.length > 0 || values.confirmPassword.length > 0

    if (!hasPasswordInput) {
      return
    }

    const parsedPassword = passwordSchema.safeParse(values.password)

    if (!parsedPassword.success) {
      for (const issue of parsedPassword.error.issues) {
        context.addIssue({
          ...issue,
          path: ["password"],
        })
      }
    }

    if (!values.confirmPassword.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please confirm your new password.",
        path: ["confirmPassword"],
      })
    }

    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      })
    }
  })