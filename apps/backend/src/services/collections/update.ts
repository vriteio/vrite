import { toUUID } from "#backend/lib/primitives";
import { collections, type Collection } from "#backend/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { normalizeCollectionName, ROOT_COLLECTION_NAME } from "#backend/lib/validation";
import { withAuthorization } from "#backend/lib/policy";

interface UpdateCollectionInput extends Partial<Pick<Collection, "name">> {
  id: string;
}

const updateCollection = withAuthorization<UpdateCollectionInput>(
  {
    actions: ({ input }) => ({
      collections: [{ action: "collection:update", collectionID: input.id }]
    }),
    transaction: "locked-workspace"
  },
  async ({ database, input, workspaceID }) => {
    if (input.name === undefined) return;

    const name = normalizeCollectionName(input.name);

    if (name === ROOT_COLLECTION_NAME) {
      throw new ORPCError("BAD_REQUEST", { message: "Reserved collection name" });
    }

    const updated = await database
      .update(collections)
      .set({ name, updatedAt: new Date() })
      .where(
        and(
          eq(collections.id, toUUID(input.id)),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt),
          sql`${collections.parentID} is not null`
        )
      )
      .returning({ id: collections.id });

    if (updated.length !== 1) throw new ORPCError("NOT_FOUND");
  }
);

export { updateCollection };
