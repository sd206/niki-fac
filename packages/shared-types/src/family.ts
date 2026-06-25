import type { FamilyRole } from "./auth.js";

export type SubscriptionTier = "free" | "premium" | "family_plus";

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export type MemberStatus = "active" | "invited" | "removed";

export interface FamilyMember {
  familyId: string;
  userId: string;
  role: FamilyRole;
  points: number;
  status: MemberStatus;
  createdAt: string;
}

export type InvitationChannel = "email" | "sms" | "link";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  id: string;
  familyId: string;
  channel: InvitationChannel;
  destination: string | null;
  role: FamilyRole;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CreateFamilyRequest {
  name: string;
}

export interface InviteMemberRequest {
  channel: InvitationChannel;
  destination?: string;
  role: FamilyRole;
}

export interface JoinFamilyRequest {
  token: string;
}
