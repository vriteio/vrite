import { permissionType, workspaceType } from "#backend/db";
import { emitWorkspaceStateEvent } from "#backend/events";
import { auth } from "#backend/lib/adapters";
import { base, sessionRoute } from "#backend/lib/transport";
import { id, toUserID, toUUID } from "#backend/lib/primitives";
import { Billing } from "#backend/services/billing";
import { Workspaces } from "#backend/services/workspaces";
import * as z from "zod";
import { Auth } from "#backend/services/auth";

const workspaceSummaryType = workspaceType.pick({
  id: true,
  name: true
});
const workspaceListItemType = workspaceSummaryType.extend({
  userID: id().describe("ID of the user associated with this workspace membership"),
  currentEntryID: id().optional().describe("ID of the member's latest active entry"),
  permissions: z.array(permissionType).describe("Permissions granted to the current member"),
  admin: z.boolean().describe("Whether the current member has the system admin role"),
  subscriptionPlan: z.string().describe("Current billing plan identifier")
});

const workspacesRouter = base.router({
  list: sessionRoute
    .meta({
      requireWorkspace: false
    })
    .output(z.array(workspaceListItemType))
    .handler(async ({ context }) => {
      const sessions = await auth.api.listDeviceSessions({
        headers: new Headers({ cookie: context.reqHeaders?.get("cookie") || "" })
      });

      const { workspaces } = await Workspaces.list({
        activeUserID: context.auth.session!.userID,
        userIDs: sessions.map((session) => toUserID(toUUID(session.user.id)))
      });

      return workspaces;
    }),
  create: sessionRoute
    .meta({
      requireWorkspace: false
    })
    .input(
      z.object({
        name: z.string().min(1).max(50).describe("Name of the workspace")
      })
    )
    .output(workspaceSummaryType)
    .handler(async ({ context, input }) => {
      const newWorkspace = await Workspaces.create({
        name: input.name,
        userID: context.auth.session!.userID
      });

      await auth.api.updateUser({
        headers: new Headers({ cookie: context.reqHeaders?.get("cookie") || "" }),
        body: {
          currentWorkspaceID: newWorkspace.id
        }
      });
      emitWorkspaceStateEvent(newWorkspace.id, {
        action: "workspace:create",
        data: newWorkspace
      });

      return newWorkspace;
    }),
  update: sessionRoute
    .input(
      z.object({
        name: z.string().min(1).max(50).optional().describe("New name of the workspace")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      if (input.name === undefined) return;

      await Workspaces.update({
        auth: context.auth,
        name: input.name
      });

      emitWorkspaceStateEvent(context.auth.workspaceID, {
        action: "workspace:update",
        memberID: context.auth.session?.memberID,
        data: {
          id: context.auth.workspaceID,
          name: input.name
        }
      });
    }),
  delete: sessionRoute
    .output(
      z.object({
        workspaceID: id().nullable().describe("The user's fallback workspace after deletion")
      })
    )
    .handler(async ({ context }) => {
      const { deletingAt } = await Workspaces.beginDeletion({
        auth: context.auth
      });

      try {
        await Auth.invalidateSessionData({ workspaceID: context.auth.workspaceID });
        await Billing.settle({
          workspaceID: context.auth.workspaceID
        });
      } catch (error) {
        await Workspaces.cancelDeletion({
          deletingAt,
          workspaceID: context.auth.workspaceID
        });
        throw error;
      }

      const { entryIDs, ...result } = await Workspaces.delete({
        auth: context.auth
      });

      emitWorkspaceStateEvent(context.auth.workspaceID, {
        action: "workspace:delete",
        memberID: context.auth.session?.memberID,
        data: {
          id: context.auth.workspaceID,
          entryIDs
        }
      });

      return result;
    }),
  switch: sessionRoute
    .meta({
      requireWorkspace: false
    })
    .input(
      z.object({
        workspaceID: id().describe("ID of the workspace to switch to")
      })
    )
    .output(z.void())
    .handler(({ context, input }) => {
      return Workspaces.switch({
        headers: new Headers({ cookie: context.reqHeaders?.get("cookie") || "" }),
        workspaceID: input.workspaceID,
        userID: context.auth.session!.userID
      });
    })
});

export { workspacesRouter };
