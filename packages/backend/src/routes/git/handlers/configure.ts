import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  FullGitData,
  WorkspaceSettings,
  getGitDataCollection,
  getWorkspaceSettingsCollection,
  gitData
} from "#collections";
import { publishGitDataEvent, publishWorkspaceSettingsEvent } from "#events";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";

const enableFilenameMetadata = async (ctx: AuthenticatedContext): Promise<void> => {
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
  const workspaceSettings = await workspaceSettingsCollection.findOne({
    workspaceId: ctx.auth.workspaceId
  });

  if (!workspaceSettings || workspaceSettings.metadata?.enabledFields?.includes("filename")) return;

  const metadata: WorkspaceSettings["metadata"] = {
    ...(workspaceSettings.metadata || {}),
    enabledFields: [
      ...(workspaceSettings.metadata?.enabledFields || [
        "slug",
        "canonical-link",
        "date",
        "tags",
        "members"
      ]),
      "filename"
    ]
  };

  await workspaceSettingsCollection.updateOne(
    { _id: ctx.auth.workspaceId },
    {
      $set: {
        metadata
      }
    }
  );
  publishWorkspaceSettingsEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: { metadata }
  });
};
const inputSchema = gitData.pick({ github: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const provider = Object.keys(input)[0] as keyof typeof input;
  const gitData: UnderscoreID<FullGitData<ObjectId>> = {
    _id: new ObjectId(),
    records: [],
    directories: [],
    provider,
    workspaceId: ctx.auth.workspaceId,
    ...input
  };

  await gitDataCollection.insertOne(gitData);
  enableFilenameMetadata(ctx);
  publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "configure",
    data: {
      records: [],
      directories: [],
      provider,
      id: `${gitData._id}`,
      ...input
    }
  });
};

export { inputSchema, handler };
