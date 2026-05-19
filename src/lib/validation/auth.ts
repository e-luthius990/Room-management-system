import { z } from "zod";

const BLOCKED_NEXT_PREFIXES = ["/auth/", "/api/", "/_next/"] as const;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.");

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

const safeNextPathSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const nextPath = value.trim();

  if (!nextPath) {
    return undefined;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return undefined;
  }

  if (nextPath.includes("\\")) {
    return undefined;
  }

  if (BLOCKED_NEXT_PREFIXES.some((prefix) => nextPath.startsWith(prefix))) {
    return undefined;
  }

  return nextPath;
}, z.string().optional());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
  next: safeNextPathSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const passwordUpdateSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;