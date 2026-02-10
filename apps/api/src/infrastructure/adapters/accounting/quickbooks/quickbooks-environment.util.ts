/**
 * QuickBooks Environment Utility
 *
 * Determines whether a user should use sandbox or production QuickBooks environment.
 * Default demo users use sandbox, all other users use production.
 */

/**
 * Get list of demo users that should use sandbox
 * Can be configured via SANDBOX_USERS environment variable (comma-separated)
 * 
 * Default demo users (one per tier):
 *   - demo-free@plainledger.ca (Free tier)
 *   - demo-pro@plainledger.ca (Professional tier)
 *   - demo@plainledger.ca (Enterprise tier)
 *   - admin@plainledger.ca (Admin)
 *   - accountant@plainledger.ca (Accountant)
 */
function getSandboxUsers(): string[] {
  const envUsers = process.env.SANDBOX_USERS;
  if (envUsers) {
    return envUsers.split(",").map((email) => email.trim().toLowerCase());
  }
  // Default demo users - one per tier plus admin users
  return [
    "demo-free@plainledger.ca",    // Free tier demo
    "demo-pro@plainledger.ca",     // Professional tier demo
    "demo@plainledger.ca",         // Enterprise tier demo
    "admin@plainledger.ca",        // Admin user
    "accountant@plainledger.ca",   // Accountant user
  ];
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
