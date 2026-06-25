export interface FamilyMemberWithUser {
  userId: string;
  familyId: string;
  role: string;
  points: number;
  status: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface InvitationWithDetails {
  id: string;
  familyId: string;
  channel: string;
  destination: string | null;
  role: string;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}
