export type FamilyRole = "owner" | "parent" | "adult" | "child" | "guest";

export const FAMILY_ROLES: readonly FamilyRole[] = [
  "owner",
  "parent",
  "adult",
  "child",
  "guest",
] as const;

/**
 * Role privilege ranking. Higher number = more privileges.
 * Used by RBAC middleware to compare a member's role against a required minimum.
 */
export const ROLE_RANK: Record<FamilyRole, number> = {
  owner: 5,
  parent: 4,
  adult: 3,
  child: 2,
  guest: 1,
};

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
}

/**
 * Per-request authorization context resolved by the API gateway after verifying
 * the Firebase JWT and loading the caller's membership in the target family.
 */
export interface FamilyContext {
  user: AuthenticatedUser;
  familyId: string;
  role: FamilyRole;
}
