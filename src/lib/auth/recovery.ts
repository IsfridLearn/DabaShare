// Set by /auth/confirm after a successful password-recovery link; holds the
// user id so it can't be reused for another account. Read by updatePassword.
export const RECOVERY_COOKIE = "ds_password_reset";
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60;
