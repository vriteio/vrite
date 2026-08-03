import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { entries, type Entry } from "#backend/db";
import { and, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { normalizeEntryName } from "#backend/lib/validation";

const updateEntry = async (
  input: { id: string; workspaceID: string } & Partial<Pick<Entry, "name">>
) => {
  if (input.name === undefined) return;

  const name = normalizeEntryName(input.name);

  const [updated] = await db
    .update(entries)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(entries.id, toUUID(input.id)),
        eq(entries.workspaceID, toUUID(input.workspaceID)),
        isNull(entries.deletedAt)
      )
    )
    .returning({ id: entries.id });

  if (!updated) throw new ORPCError("NOT_FOUND");
};

export { updateEntry };
