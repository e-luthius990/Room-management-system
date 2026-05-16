const AUTH_ERROR_MESSAGES = {
  invalid_input: "Check the form and try again.",
  invalid_credentials: "The email or password is incorrect.",
  missing_auth_code: "The sign-in link is invalid or expired.",
  auth_callback_failed: "We could not complete authentication. Try again.",
  profile_missing: "Your account exists, but your internal profile has not been created.",
  account_disabled: "This account has been disabled.",
  account_suspended: "This account is currently suspended.",
  access_not_assigned: "Your account exists, but role or camp access has not been assigned.",
  invite_not_ready: "Your invite is not ready. Contact your system administrator.",
  invite_expired: "This invite has expired. Ask your administrator to send a new one.",
  password_update_failed: "We could not update your password. Try again.",
  reset_request_failed: "We could not send the reset link. Try again.",
  session_required: "Open the secure link from your email first.",
  unauthorized: "You need to sign in to continue.",
  forbidden: "You do not have permission to perform this action.",

  role_not_found: "The selected role could not be found.",
  role_not_allowed: "You cannot assign that role.",
  camp_required: "Select a camp for this role.",
  camp_not_found: "The selected camp is not available.",
  camp_not_allowed: "You cannot assign access to that camp.",
  user_exists: "A user with that email already exists.",
  invite_failed: "We could not send the invite. Try again.",
  profile_create_failed: "The invite was created, but the profile could not be saved.",
  role_assign_failed: "The invite was created, but the role could not be assigned.",
  camp_access_failed: "The invite was created, but camp access could not be assigned.",

  unexpected: "Something went wrong. Try again.",
} as const;

const AUTH_SUCCESS_MESSAGES = {
  reset_link_sent: "If the email exists, a reset link has been sent.",
  password_updated: "Your password has been updated. You can now continue.",
  invite_accepted: "Your account has been activated.",
  signed_out: "You have been signed out.",
  user_invited: "The user invite has been sent.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;
export type AuthSuccessCode = keyof typeof AUTH_SUCCESS_MESSAGES;

export function getAuthMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[code as AuthErrorCode] ?? AUTH_ERROR_MESSAGES.unexpected;
}

export function getSuccessMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }

  return AUTH_SUCCESS_MESSAGES[code as AuthSuccessCode] ?? null;
}