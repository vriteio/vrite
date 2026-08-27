import { collections } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUUID } from "#backend/lib/primitives";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { canManageRestrictedCollections, type SessionData } from "#backend/lib/policy";

const setCollectionRestricted = async (input: {
  auth: SessionData;
  id: string;
  restricted: boolean;
  workspaceID: string;
}): Promise<void> => {
  if (input.restricted && input.auth.subscriptionPlan !== "pro") {
    throw new ORPCError("FORBIDDEN", {
      message: "This action requires an Andesine Pro subscription"
    });
  }

  if (!canManageRestrictedCollections(input.auth)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Restricted collections permission is required"
    });
  }

  const updated = await db
    .update(collections)
    .set({ restricted: input.restricted, updatedAt: new Date() })
    .where(
      and(
        eq(collections.id, toUUID(input.id)),
        eq(collections.workspaceID, toUUID(input.workspaceID)),
        isNull(collections.deletedAt),
        sql`${collections.parentID} is not null`
      )
    )
    .returning({ id: collections.id });

  if (updated.length !== 1) throw new ORPCError("NOT_FOUND");
};

export { setCollectionRestricted };
