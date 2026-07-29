import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { entries, type Entry } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const updateEntry = async (
  input: { id: string; workspaceID: string } & Partial<Pick<Entry, "name">>
) => {
  if (input.name === undefined) return;

  const [updated] = await db
    .update(entries)
    .set({ name: input.name, updatedAt: new Date() })
    .where(
      and(eq(entries.id, toUUID(input.id)), eq(entries.workspaceID, toUUID(input.workspaceID)))
    )
    .returning({ id: entries.id });

  if (!updated) throw new ORPCError("NOT_FOUND");
};

export { updateEntry };
