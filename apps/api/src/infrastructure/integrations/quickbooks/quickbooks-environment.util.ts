/**
 * QuickBooks Environment Utility
 *
 * Determines whether a user should use sandbox or production QuickBooks environment.
 * Default demo users use sandbox, all other users use production.
 */

// Default demo users that should use sandbox
const SANDBOX_USERS = [
  "admin@plainledger.ca",
  "accountant@plainledger.ca",
  "demo@plainledger.ca",
];

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
  // Check if user is one of the default demo users
  return SANDBOX_USERS.includes(userEmail.toLowerCase());
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
