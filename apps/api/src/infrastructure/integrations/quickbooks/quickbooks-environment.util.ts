/**
 * QuickBooks Environment Utility
 *
 * Determines whether a user should use sandbox or production QuickBooks environment.
 * Default demo users use sandbox, all other users use production.
 */

/**
 * Get list of demo users that should use sandbox
 * Can be configured via SANDBOX_USERS environment variable (comma-separated)
 */
function getSandboxUsers(): string[] {
  const envUsers = process.env.SANDBOX_USERS;
  if (envUsers) {
    return envUsers.split(",").map((email) => email.trim().toLowerCase());
  }
  // Default demo users
  return [
    process.env.ADMIN_EMAIL || "admin@plainledger.ca",
    process.env.ACCOUNTANT_EMAIL || "accountant@plainledger.ca",
    process.env.DEMO_EMAIL || "demo@plainledger.ca",
  ].map((email) => email.toLowerCase());
}

/**
 * Determine if a user should use sandbox based on their email
 * @param userEmail - User's email address (from Keycloak token)
 * @returns true if user should use sandbox, false for production
 */
export function shouldUseSandbox(userEmail?: string): boolean {
  if (!userEmail) {
    // If no user email, default to sandbox for safety
    return true;
  }
  // Check if user is one of the configured demo users
  return getSandboxUsers().includes(userEmail.toLowerCase());
}

/**
 * Get the QuickBooks environment string for a user
 * @param userEmail - User's email address (from Keycloak token)
 * @returns "sandbox" or "production"
 */
export function getQuickBooksEnvironment(
  userEmail?: string,
): "sandbox" | "production" {
  return shouldUseSandbox(userEmail) ? "sandbox" : "production";
}
