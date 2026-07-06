import { toUserID, workspaceType } from "#backend/db";
import { emitWorkspaceStateEvent } from "#backend/events";
import { auth } from "#backend/lib/auth";
import { authorized } from "#backend/lib/middleware";
import { objectID, toObjectID } from "#backend/lib/mongo";
import { base } from "#backend/lib/orpc";
import { Workspaces } from "#backend/services/workspaces";
import * as z from "zod";

const workspaceSummaryType = workspaceType.pick({
  id: true,
  name: true
});
const workspaceListItemType = workspaceSummaryType.extend({
  userID: objectID().describe("ID of the user associated with this workspace membership")
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
        userIDs: sessions.map((session) => {
          return toUserID(toObjectID(session.user.id));
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
    .handler(({ context, input }) => {
      const result = Workspaces.create({
        name: input.name,
        userID: context.auth.session!.userID
      });

      result.then((workspace) => {
        emitWorkspaceStateEvent(workspace.id, {
          action: "workspace:create",
          data: workspace
        });
      });

      return result;
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
    .handler(({ context, input }) => {
      const result = Workspaces.update({
        workspaceID: context.auth.workspaceID,
        name: input.name
      });

      result.then(() => {
        if (input.name === undefined) return;

        emitWorkspaceStateEvent(context.auth.workspaceID, {
          action: "workspace:update",
          memberID: context.auth.session?.memberID,
          data: {
            id: context.auth.workspaceID,
            name: input.name
          }
        });
      });

      return result;
    }),
  delete: base
    .meta({
      required: {
        session: "admin"
      }
    })
    .use(authorized)
    .output(z.void())
    .handler(({ context }) => {
      const result = Workspaces.delete({
        workspaceID: context.auth.workspaceID,
        userID: context.auth.session!.userID
      });

      result.then(() => {
        emitWorkspaceStateEvent(context.auth.workspaceID, {
          action: "workspace:delete",
          memberID: context.auth.session?.memberID,
          data: {
            id: context.auth.workspaceID
          }
        });
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
        workspaceID: objectID().describe("ID of the workspace to switch to")
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
