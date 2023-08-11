import { App, Octokit, createNodeMiddleware } from "octokit";
import MiddiePlugin from "@fastify/middie";
import { publicPlugin } from "#lib/plugin";

declare module "fastify" {
  interface FastifyInstance {
    github: App;
  }
}

const githubPlugin = publicPlugin(async (fastify) => {
  const app = new App({
    appId: fastify.config.GITHUB_APP_ID,
    privateKey: fastify.config.GITHUB_APP_PRIVATE_KEY,
    webhooks: { secret: fastify.config.GITHUB_APP_WEBHOOK_SECRET },
    oauth: {
      clientId: fastify.config.GITHUB_APP_CLIENT_ID,
      clientSecret: fastify.config.GITHUB_APP_CLIENT_SECRET
    }
  });

  fastify.decorate("github", app);
  fastify.get("/github/authorize", (req, res) => {
    const { url } = app.oauth.getWebFlowAuthorizationUrl({});

    res.redirect(url);
  });
  fastify.get<{
    Querystring: {
      code: string;
    };
  }>("/github/callback", async (req, res) => {
    const { code } = req.query;
    const { authentication } = await app.oauth.createToken({
      code: code as string,
      state: ""
    });

    res.redirect(`/?token=${authentication.token}`);
  });
  await fastify.register(MiddiePlugin);
  fastify.use(createNodeMiddleware(app));
});

export { githubPlugin };
