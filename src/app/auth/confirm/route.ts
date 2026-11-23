import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE } from "@/lib/auth/recovery";
import { safeNextPath } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

// Only the link types DabaShare actually sends.
const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "email_change"];

// Landing point for every auth email link.
// - ?code=              default templates (PKCE; only works in the browser that
//                       started the flow, but Supabase has already confirmed the
//                       email by the time we get here)
// - ?token_hash=&type=  custom templates (needs custom SMTP; works across devices).
//                       Before enabling them, change this to a "Continue" button
//                       that POSTs, so email scanners can't burn the one-time token.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), "/onboarding");
  const isRecovery = next === "/reset-password" || searchParams.get("type") === "recovery";

  const fail = (notice: string) => {
    const target = isRecovery ? "/forgot-password" : "/login";
    return NextResponse.redirect(new URL(`${target}?notice=${notice}`, request.url));
  };

  if (searchParams.get("error_code") === "otp_expired") return fail("link-expired");
  if (searchParams.get("error")) return fail("link-invalid");

  const supabase = await createClient();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  let userId: string | undefined;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail("link-invalid");
    userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // Opened on another device/browser: the email is confirmed, but the session
    // can only be created where signup started. Ask them to sign in instead.
    if (error) return fail(isRecovery ? "link-other-device" : "confirmed-sign-in");
    userId = data.user?.id;
  } else {
    return fail("link-invalid");
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  if (isRecovery && userId) {
    response.cookies.set(RECOVERY_COOKIE, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: RECOVERY_COOKIE_MAX_AGE,
    });
  }
  return response;
}
