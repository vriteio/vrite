import { entryVersions } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { VersionDetails } from "#backend/lib/data";
import { getVersion } from "./get";
import type { SessionData } from "#backend/lib/policy";

const updateVersion = async (input: {
  auth: SessionData;
  workspaceID: string;
  versionID: string;
  name: string | null;
}): Promise<VersionDetails> => {
  await getVersion(input);

  const [updated] = await db
    .update(entryVersions)
    .set({ name: input.name, updatedAt: new Date() })
    .where(
      and(
        eq(entryVersions.id, toUUID(input.versionID)),
        eq(entryVersions.workspaceID, toUUID(input.workspaceID))
      )
    )
    .returning({ id: entryVersions.id });

  if (!updated) throw new ORPCError("NOT_FOUND", { message: "Version not found" });

  return getVersion(input);
};

export { updateVersion };
