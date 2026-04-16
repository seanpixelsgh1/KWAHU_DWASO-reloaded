/**
 * Robustly formats a user's display name with context-aware fallbacks.
 * Handles null, undefined, empty strings, and fragmented "undefined undefined" literals.
 * 
 * @param name - The name string to format
 * @param fallback - The context-specific fallback (e.g., "Admin", "Guest", "Unnamed User")
 * @param profile - Optional profile object to extract name from if name is invalid
 * @returns A safe, trimmed display name
 */
export function formatDisplayName(
  name?: string | null,
  fallback: string = "User",
  profile?: { firstName?: string; lastName?: string } | null
): string {
  const trimmed = name?.trim();

  // Specifically target broken concatenations and empty strings
  const isInvalid = !trimmed || 
                    trimmed.toLowerCase() === "undefined undefined" || 
                    trimmed.toLowerCase() === "null null";

  if (!isInvalid) return name!.trim();

  // If name is invalid, try to construct from profile
  if (profile?.firstName || profile?.lastName) {
    const constructed = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
    if (constructed && 
        constructed.toLowerCase() !== "undefined undefined" && 
        constructed.toLowerCase() !== "null null") {
      return constructed;
    }
  }

  return fallback;
}
