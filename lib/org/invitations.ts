/**
 * lib/org/invitations.ts — email-based org invitations (multi-tenant UX).
 * Node-only. Sends the accept link via `sendEmail` (`lib/email/send.ts`) —
 * Resend if configured, else console.log in dev.
 *
 * Token/expiry/status are generated here, not by callers. Tokens are single-use:
 * accepting flips status to `accepted`; withdrawing flips it to `revoked`.
 */

import { randomUUID } from "node:crypto";

import { env } from "@/config/env.schema";
import { db } from "@/lib/db";
import {
  INVITATION_STATUSES,
  type Invitation,
  type Organization,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import type { AuthUser } from "@/lib/auth/types";

/** How long a new invitation stays valid. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function newToken(): string {
  return `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
}

export interface InviteToOrgParams {
  org: Organization;
  email: string;
  role: string;
  invitedBy: AuthUser;
}

/**
 * Create a pending invitation and email the accept link. Rejects a duplicate
 * pending invite or an email that already belongs to a member of the org.
 */
export async function inviteToOrg(
  params: InviteToOrgParams,
): Promise<Invitation> {
  const { org, invitedBy } = params;
  const email = params.email.trim().toLowerCase();

  const existingPending = await db.getPendingInvitationForEmail(org.id, email);
  if (existingPending) {
    throw new Error("An invitation is already pending for that email");
  }

  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    const membership = await db.getMembership(org.id, existingUser.id);
    if (membership) {
      throw new Error("That user is already a member of this organization");
    }
  }

  const invitation = await db.createInvitation({
    organizationId: org.id,
    email,
    role: params.role,
    token: newToken(),
    status: INVITATION_STATUSES.pending,
    invitedByUserId: invitedBy.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const url = `${env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;
  await sendEmail({
    to: email,
    subject: `You're invited to join ${org.name}`,
    text: `You've been invited to join ${org.name}. Accept your invitation: ${url}`,
    html: `<p>You've been invited to join <strong>${org.name}</strong>.</p><p>Accept your invitation by clicking <a href="${url}">this link</a>. It expires in 7 days.</p>`,
  });

  return invitation;
}

export interface AcceptInvitationResult {
  organizationId: string;
}

/**
 * Accept an invitation for `user`. Validates the token exists, is still pending,
 * hasn't expired, and was addressed to this user's email; then adds the
 * membership (idempotently) and marks the invite accepted.
 */
export async function acceptInvitation(
  token: string,
  user: AuthUser,
): Promise<AcceptInvitationResult> {
  const invitation = await db.getInvitationByToken(token);
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== INVITATION_STATUSES.pending) {
    throw new Error("This invitation is no longer valid");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new Error("This invitation has expired");
  }
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
  }

  const existing = await db.getMembership(invitation.organizationId, user.id);
  if (!existing) {
    await db.addMember({
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role,
    });
  }
  await db.updateInvitationStatus(invitation.id, INVITATION_STATUSES.accepted);

  return { organizationId: invitation.organizationId };
}

/** Withdraw a pending invitation. */
export async function revokeInvitation(id: string): Promise<void> {
  await db.updateInvitationStatus(id, INVITATION_STATUSES.revoked);
}
