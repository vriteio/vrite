import { permissionType, workspaceType } from "#backend/db";
import { emitWorkspaceStateEvent } from "#backend/events";
import { auth } from "#backend/lib/auth";
import { authorized } from "#backend/lib/middleware";
import { id, toUserID, toUUID } from "#backend/lib/id";
import { base } from "#backend/lib/orpc";
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
  permissions: z.array(permissionType).describe("Permissions granted to the current member"),
  admin: z.boolean().describe("Whether the current member has the system admin role")
});

const workspacesRouter = base.router({
  list: base
    .meta({
      requireWorkspace: false,
      required: {
        session: true
      }
    })
    .use(authorized)
    .output(z.array(workspaceListItemType))
    .handler(async ({ context }) => {
      const sessions = await auth.api.listDeviceSessions({
        headers: new Headers({ cookie: context.reqHeaders?.get("cookie") || "" })
      });

      return Workspaces.list({
        activeUserID: context.auth.session!.userID,
        userIDs: sessions.map((session) => {
          return toUserID(toUUID(session.user.id));
        })
      });
    }),
  create: base
    .meta({
      requireWorkspace: false,
      required: {
        session: true
      }
    })
    .use(authorized)
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
  update: base
    .meta({
      required: {
        session: ["workspace"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        name: z.string().min(1).max(50).optional().describe("New name of the workspace")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      if (input.name === undefined) return;

      await Workspaces.update({
        workspaceID: context.auth.workspaceID,
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
  delete: base
    .meta({
      required: {
        session: "admin"
      }
    })
    .use(authorized)
    .output(
      z.object({
        workspaceID: id().nullable().describe("The user's fallback workspace after deletion")
      })
    )
    .handler(async ({ context }) => {
      await Auth.invalidateSessionData({ workspaceID: context.auth.workspaceID });
      await Billing.endSubscription({
        workspaceID: context.auth.workspaceID
      });

      const { entryIDs, ...result } = await Workspaces.delete({
        workspaceID: context.auth.workspaceID,
        userID: context.auth.session!.userID
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
  switch: base
    .meta({
      requireWorkspace: false,
      required: {
        session: true
      }
    })
    .use(authorized)
    .input(
      z.object({
        workspaceID: id().describe("ID of the workspace to switch to")
      })
    )
    .output(z.void())
    .handler(({ context, input }) => {
      return Workspaces.switch({
        workspaceID: input.workspaceID,
        userID: context.auth.session!.userID
      });
    })
});

export { workspacesRouter };
