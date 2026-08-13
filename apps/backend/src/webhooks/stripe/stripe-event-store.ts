import { invitations, stripeWebhookEvents, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { and, eq, ne, sql } from "drizzle-orm";
import type Stripe from "stripe";

const registerStripeWebhookEvent = async (event: Stripe.Event): Promise<boolean> => {
  await db
    .insert(stripeWebhookEvents)
    .values({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>
    })
    .onConflictDoNothing({ target: stripeWebhookEvents.id });
  const [storedEvent] = await db
    .select({ status: stripeWebhookEvents.status })
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.id, event.id));

  return storedEvent?.status === "processed";
};
const getWorkspaceDeletionState = async (workspaceID: string) => {
  const [workspace] = await db
    .select({ id: workspaces.id, deletingAt: workspaces.deletingAt })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceID))
    .limit(1);

  return workspace;
};
const persistStripeWebhookResult = async (input: {
  eventID: string;
  workspaceID: string | null;
  update?: Partial<typeof workspaces.$inferInsert>;
}): Promise<{ revokedInviteIDs: string[] }> => {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({ status: stripeWebhookEvents.status })
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.id, input.eventID))
      .for("update");

    if (!record || record.status === "processed") return { revokedInviteIDs: [] };

    const [workspace] = input.workspaceID
      ? await tx
          .select({
            id: workspaces.id,
            deletingAt: workspaces.deletingAt,
            subscriptionPlan: workspaces.subscriptionPlan
          })
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceID))
          .for("update")
      : [];
    const persistedWorkspaceID = workspace?.id ?? null;
    const isDowngrade =
      workspace?.subscriptionPlan === "pro" && input.update?.subscriptionPlan === "free";

    let revokedInviteIDs: string[] = [];

    await tx
      .update(stripeWebhookEvents)
      .set({
        status: "processing",
        attempts: sql`${stripeWebhookEvents.attempts} + 1`,
        workspaceID: persistedWorkspaceID,
        lastError: null
      })
      .where(eq(stripeWebhookEvents.id, input.eventID));

    if (persistedWorkspaceID && !workspace?.deletingAt && input.update) {
      await tx.update(workspaces).set(input.update).where(eq(workspaces.id, persistedWorkspaceID));

      if (isDowngrade) {
        const revokedInvites = await tx
          .delete(invitations)
          .where(
            and(
              eq(invitations.workspaceID, persistedWorkspaceID),
              eq(invitations.status, "pending")
            )
          )
          .returning({ id: invitations.id });

        revokedInviteIDs = revokedInvites.map(({ id }) => id);
      }
    }

    await tx
      .update(stripeWebhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(stripeWebhookEvents.id, input.eventID));

    return { revokedInviteIDs };
  });
};
const failStripeWebhookEvent = async (eventID: string, error: unknown): Promise<void> => {
  await db
    .update(stripeWebhookEvents)
    .set({
      status: "failed",
      lastError: error instanceof Error ? error.message : String(error)
    })
    .where(and(eq(stripeWebhookEvents.id, eventID), ne(stripeWebhookEvents.status, "processed")));
};

export {
  failStripeWebhookEvent,
  getWorkspaceDeletionState,
  persistStripeWebhookResult,
  registerStripeWebhookEvent
};
