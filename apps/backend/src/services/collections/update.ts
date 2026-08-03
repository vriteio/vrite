import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { collections, type Collection } from "#backend/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { normalizeCollectionName, ROOT_COLLECTION_NAME } from "#backend/lib/validation";

const updateCollection = async (
  input: { id: string; workspaceID: string } & Partial<Pick<Collection, "name">>
) => {
  if (input.name === undefined) return;

  const name = normalizeCollectionName(input.name);

  if (name === ROOT_COLLECTION_NAME) {
    throw new ORPCError("BAD_REQUEST", { message: "Reserved collection name" });
  }

  const updated = await db
    .update(collections)
    .set({ name, updatedAt: new Date() })
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

export { updateCollection };
