import {
  subscribeToWorkspaceEvents,
  workspaceEventType,
  workspaceSettingsEventType
} from "#backend/events";
import {
  collectionType,
  entryType,
  inviteType,
  keyPermissionType,
  keyType,
  membershipType,
  permissionType,
  roleType,
  userProfileType,
  workspaceType
} from "#backend/db";
import { viaIterator } from "#backend/lib/events";
import { authorized } from "#backend/lib/middleware";
import { base } from "#backend/lib/orpc";
import { Sync } from "#backend/services/sync";
import * as z from "zod";
import { objectID } from "#backend/lib/mongo";

const explorerTreeType = z.object({
  collections: z.array(collectionType),
  entries: z.array(entryType)
});
const workspaceSummaryType = workspaceType.pick({
  id: true,
  name: true
});
const memberDetailsType = z.object({
  id: membershipType.shape.id,
  userID: userProfileType.shape.id,
  roleID: membershipType.shape.roleID.optional(),
  roleName: z.string().optional(),
  admin: z.boolean().optional(),
  profile: userProfileType
});
const inviteDetailsType = inviteType.extend({
  workspaceID: objectID()
});
const viewerAccessType = z.union([
  z.object({
    type: z.literal("session"),
    workspaceID: objectID(),
    subscriptionPlan: z.string(),
    session: z.object({
      memberID: objectID(),
      userID: objectID(),
      roleID: objectID(),
      permissions: z.array(permissionType),
      admin: z.boolean()
    })
  }),
  z.object({
    type: z.literal("key"),
    workspaceID: objectID(),
    subscriptionPlan: z.string(),
    key: z.object({
      keyID: objectID(),
      permissions: z.array(keyPermissionType)
    })
  })
]);
const workspaceMetadataType = z.object({
  viewer: viewerAccessType,
  workspace: workspaceSummaryType.optional(),
  collections: z.array(collectionType).optional(),
  entries: z.array(entryType).optional(),
  memberships: z.array(memberDetailsType).optional(),
  invites: z.array(inviteDetailsType).optional(),
  roles: z.array(roleType).optional(),
  keys: z.array(keyType).optional()
});

const syncRouter = base.router({
  getMetadata: base
    .meta({
      required: {
        session: true,
        key: true
      }
    })
    .use(authorized)
    .output(workspaceMetadataType)
    .handler(async ({ context }) => {
      return Sync.getWorkspaceMetadata({
        auth: context.auth
      });
    }),
  getExplorerTree: base
    .meta({
      required: {
        session: ["content"]
      }
    })
    .use(authorized)
    .output(explorerTreeType)
    .handler(async ({ context }) => {
      return Sync.getExplorerTree({
        workspaceID: context.auth.workspaceID
      });
    }),
  workspaceUpdates: base.use(authorized).handler(async function* ({ context, signal }) {
    const eventIterator = viaIterator(subscribeToWorkspaceEvents, context.auth.workspaceID, {
      signal
    });
    for await (const eventPayload of eventIterator) {
      const parsedEvent = workspaceEventType.safeParse(eventPayload);

      if (!parsedEvent.success) {
        continue;
      }

      if (!Sync.isWorkspaceEventVisible(context.auth, parsedEvent.data)) {
        continue;
      }

      yield parsedEvent.data;
    }
  })
});

export { syncRouter };
