import { entries, memberships } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUUID } from "#backend/lib/primitives";
import { and, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import {
  assertEntryAccess,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

const setCurrentEntry = async (input: {
  auth: SessionData;
  entryID: string;
  memberID: string;
  workspaceID: string;
}): Promise<void> => {
  const access = await loadRestrictedCollectionAccess(input.auth);

  await assertEntryAccess(input.auth, access, input.entryID);

  const entryID = toUUID(input.entryID);
  const memberID = toUUID(input.memberID);
  const workspaceID = toUUID(input.workspaceID);
  const [entry] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(eq(entries.id, entryID), eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt))
    );

  if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

  await db
    .update(memberships)
    .set({ currentEntryID: entryID, updatedAt: new Date() })
    .where(and(eq(memberships.id, memberID), eq(memberships.workspaceID, workspaceID)));
};

export { setCurrentEntry };
