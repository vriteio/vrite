import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { collections, workspaces } from "#backend/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const deleteCollections = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  if (input.ids.length === 0) return;

  const ids = input.ids.map(toUUID);
  const workspaceID = toUUID(input.workspaceID);
  await db.transaction(async (tx) => {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const [root] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.workspaceID, workspaceID), isNull(collections.parentID)));

    if (root && ids.includes(root.id)) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot delete the root collection" });
    }

    const idList = sql.join(
      ids.map((id) => sql`${id}::uuid`),
      sql`, `
    );

    await tx.execute(sql`
      with recursive subtree as (
        select id
        from ${collections}
        where workspace_id = ${workspaceID}::uuid and id in (${idList})
        union all
        select child.id
        from ${collections} child
        inner join subtree parent on child.parent_id = parent.id
        where child.workspace_id = ${workspaceID}::uuid
      )
      delete from ${collections}
      where workspace_id = ${workspaceID}::uuid
        and id in (select id from subtree)
    `);
  });
};

export { deleteCollections };
