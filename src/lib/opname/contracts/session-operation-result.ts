// ---------------------------------------------------------------------------
// RC1 P0H.3G — Session Operation Result Contract (DOMAIN CONTRACT)
// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for SessionOperationResult.
// Used by: Application Facade, Lifecycle Service, UI.
// DO NOT DUPLICATE — import from here.
// ---------------------------------------------------------------------------
// RC1: operations always succeed (no failure modes yet).
// RC2: lifecycle service will populate success/message based on actual outcome.
// ---------------------------------------------------------------------------

export interface SessionOperationResult {
  success: boolean;
  message?: string;
}
