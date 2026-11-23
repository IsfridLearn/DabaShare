// Messages shown on auth pages after a redirect (?notice=...).
const NOTICES: Record<string, { tone: "info" | "success" | "error"; text: string }> = {
  "confirmed-sign-in": {
    tone: "success",
    text: "Your email is confirmed. Sign in to continue.",
  },
  "link-expired": { tone: "error", text: "That link has expired. Request a new one below." },
  "link-invalid": { tone: "error", text: "That link isn't valid anymore. Request a new one below." },
  "link-other-device": {
    tone: "error",
    text: "Open the reset link on the same device and browser where you requested it.",
  },
  "account-deleted": { tone: "info", text: "Your account and its data have been deleted." },
  "session-ended": { tone: "info", text: "Your session has ended. Please sign in again." },
};

export function getNotice(key: string | string[] | undefined) {
  return typeof key === "string" ? NOTICES[key] : undefined;
}
