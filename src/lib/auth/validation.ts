import { z } from "zod";
import { SIGNED_IN_HOME } from "./routes";

// Only same-site relative paths are allowed after login or email links,
// so a crafted link cannot send users to another website.
export function safeNextPath(next: unknown, fallback = SIGNED_IN_HOME): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

// Trim and lowercase before validating; zod checks run in declaration order.
const email = z
  .string({ error: "Enter a valid email address." })
  .trim()
  .toLowerCase()
  .max(254, { error: "Enter a valid email address." })
  .pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSchema = z
  .string()
  .min(8, { error: "Use at least 8 characters." })
  // bcrypt's limit is 72 bytes, not characters (accented letters take 2+ bytes).
  .refine((v) => new TextEncoder().encode(v).length <= 72, { error: "That password is too long." })
  .regex(/[A-Za-z]/, { error: "Include at least one letter." })
  .regex(/[0-9]/, { error: "Include at least one number." });

const displayName = z
  .string()
  .trim()
  .min(1, { error: "Enter your name." })
  .max(60, { error: "Use at most 60 characters." });

const universityId = z.coerce
  .number({ error: "Choose your university." })
  .int({ error: "Choose your university." })
  .positive({ error: "Choose your university." });

export const signUpSchema = z.object({
  displayName,
  email,
  universityId,
  password: passwordSchema,
  confirmAge: z.literal("on", { error: "You must be 18 or older to join." }),
  acceptTerms: z.literal("on", { error: "Please accept the privacy notice to continue." }),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Enter your current password." }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, {
    error: "3–20 characters: lowercase letters, numbers and underscores.",
  });

export const profileSchema = z.object({
  username: usernameSchema,
  displayName,
  universityId,
  program: z.string().trim().max(100, { error: "Use at most 100 characters." }),
  bio: z.string().trim().max(500, { error: "Use at most 500 characters." }),
});

// Single-field schemas, reused by the forms for inline (on blur) checks.
// The server re-validates everything; these only give earlier feedback.
export { displayName as displayNameSchema, email as emailSchema };

export const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "A letter", test: (v) => /[A-Za-z]/.test(v) },
  { label: "A number", test: (v) => /[0-9]/.test(v) },
];
