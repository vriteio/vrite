import { handleContentPieceCreated } from "./handlers/content-piece-created";
import { handleContentPieceRemoved } from "./handlers/content-piece-removed";
import { handleContentPieceMoved } from "./handlers/content-piece-moved";
import { handleContentPieceUpdated } from "./handlers/content-piece-updated";
import { handleContentGroupCreated } from "./handlers/content-group-created";
import { handleContentGroupRemoved } from "./handlers/content-group-removed";
import { handleContentGroupMoved } from "./handlers/content-group-moved";
import { handleContentGroupUpdated } from "./handlers/content-group-updated";
import { App } from "octokit";
import { FastifyInstance } from "fastify";
import { createPlugin } from "#lib/plugin";

declare module "fastify" {
  interface FastifyInstance {
    github: App;
  }
}

const registerGitHubApp = (fastify: FastifyInstance): void => {
  const app = new App({
    appId: fastify.config.GITHUB_APP_ID || "",
    privateKey: fastify.config.GITHUB_APP_PRIVATE_KEY || "",
    webhooks: {
      secret: " "
    },
    oauth: {
      clientId: fastify.config.GITHUB_APP_CLIENT_ID || "",
      clientSecret: fastify.config.GITHUB_APP_CLIENT_SECRET || ""
    }
  });

  fastify.decorate("github", app);
  fastify.get<{
    Querystring: {
      path: string;
    };
  }>("/github/authorize", (req, res) => {
    const { path } = req.query;
    const { url } = app.oauth.getWebFlowAuthorizationUrl({
      state: encodeURIComponent(path)
    });

    res.redirect(url);
  });
  fastify.get<{
    Querystring: {
      code: string;
      state: string;
    };
  }>("/github/callback", async (req, res) => {
    const { code, state } = req.query;
    const { authentication } = await app.oauth.createToken({
      code: code as string
    });
    const path = decodeURIComponent(state);

    res.redirect(`${path}?token=${authentication.token}`);
  });
};
const gitSyncPlugin = createPlugin(async (fastify) => {
  if (!fastify.hostConfig.githubApp) return;

  registerGitHubApp(fastify);
  fastify.routeCallbacks.register("contentPieces.create", (ctx, data) => {
    handleContentPieceCreated(ctx, {
      contentPiece: data.contentPiece,
      contentBuffer: data.contentBuffer
    });
  });
  fastify.routeCallbacks.register("contentPieces.delete", (ctx, data) => {
    handleContentPieceRemoved(ctx, { contentPiece: data.contentPiece });
  });
  fastify.routeCallbacks.register("contentPieces.move", (ctx, data) => {
    handleContentPieceMoved(ctx, {
      contentPiece: data.updatedContentPiece,
      contentGroupId: `${data.updatedContentPiece.contentGroupId}`
    });
  });
  fastify.routeCallbacks.register("contentPieces.update", (ctx, data) => {
    handleContentPieceUpdated(ctx, {
      contentPiece: data.updatedContentPiece
    });
  });
  fastify.routeCallbacks.register("contentGroups.create", (ctx, data) => {
    handleContentGroupCreated(ctx, {
      contentGroup: data.contentGroup
    });
  });
  fastify.routeCallbacks.register("contentGroups.delete", (ctx, data) => {
    handleContentGroupRemoved(ctx, { contentGroup: data.contentGroup });
  });
  fastify.routeCallbacks.register("contentGroups.move", (ctx, data) => {
    handleContentGroupMoved(ctx, {
      ancestor: `${data.updatedContentGroup.ancestors.at(-1) || ""}` || null,
      contentGroup: data.updatedContentGroup
    });
  });
  fastify.routeCallbacks.register("contentGroups.update", (ctx, data) => {
    const newAncestor = data.updatedContentGroup.ancestors.at(-1);
    const newName = data.updatedContentGroup.name;
    const ancestorUpdated = newAncestor !== data.contentGroup.ancestors.at(-1);
    const nameUpdated = newName !== data.contentGroup.name;

    handleContentGroupUpdated(ctx, {
      contentGroup: data.contentGroup,
      ancestor: ancestorUpdated ? `${newAncestor || ""}` || undefined : undefined,
      name: nameUpdated ? newName : undefined
    });
  });
});

export { gitSyncPlugin };
