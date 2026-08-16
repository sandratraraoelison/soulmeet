export function getSessionRoute(
  authenticated: boolean,
  profileComplete: boolean,
  hasCoach: boolean,
) {
  if (!authenticated) return '/(public)/welcome' as const;
  if (!profileComplete || !hasCoach) return '/(onboarding)/companion' as const;
  return '/(app)/home' as const;
}
