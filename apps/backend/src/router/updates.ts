import { subscribeToWorkspaceEvents, workspaceEventType } from "#backend/events";
import { unsubscribeFromEventByKey } from "#backend/lib/events";
import { authorize, sessionPlugin } from "#backend/plugins";
import Elysia from "elysia";

const updatesRouterPlugin = new Elysia()
  .use(sessionPlugin)
  .derive(async ({ cookie }) => ({
    session: await authorize(cookie.session.value)
  }))
  .group("/updates", (app) => {
    return app.ws("/", {
      open: (ws) => {
        subscribeToWorkspaceEvents(
          ws.data.session.workspaceID,
          (event) => {
            ws.send(event);
          },
          {
            unsubscribeKey: `${ws.id}:${ws.data.session.workspaceID}`
          }
        );
      },
      close: (ws) => {
        unsubscribeFromEventByKey(`${ws.id}:${ws.data.session.workspaceID}`);
      },
      response: workspaceEventType
    });
  });

export { updatesRouterPlugin };
