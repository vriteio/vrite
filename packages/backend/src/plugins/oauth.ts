import axios from "axios";
import fastifyOAuth2, { FastifyOAuth2Options, OAuth2Namespace } from "@fastify/oauth2";
import { ObjectId } from "mongodb";
import { FastifyInstance } from "fastify";
import { getUserSettingsCollection, getUsersCollection } from "#collections";
import { generateSalt } from "#lib/hash";
import { createPlugin } from "#lib/plugin";
import { createSession } from "#lib/session";
import { createWorkspace } from "#lib/workspace";

declare module "fastify" {
  interface FastifyInstance {
    githubOAuth2: OAuth2Namespace;
  }
}

const registerGitHubOAuth = (fastify: FastifyInstance): void => {
  const oAuthConfig: Record<string, FastifyOAuth2Options> = {
    github: {
      name: "githubOAuth2",
      scope: ["read:user", "user:email"],
      credentials: {
        client: {
          id: fastify.config.GITHUB_CLIENT_ID || "",
          secret: fastify.config.GITHUB_CLIENT_SECRET || ""
        },
        auth: fastifyOAuth2.GITHUB_CONFIGURATION
      },
      startRedirectPath: "/login/github",
      callbackUri: `${fastify.config.PUBLIC_APP_URL}/login/github/callback`,
      generateStateFunction: (request) => {
        const plan = (request.query as Record<string, string>).plan || "personal";

        return `plan:${plan}`;
      },
      checkStateFunction: () => {
        return true;
      }
    }
  };

  fastify.get("/login/github/callback", async (req, res) => {
    try {
      const db = fastify.mongo.db!;
      const github = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
      const state = (req.query as Record<string, string>).state || "";
      const users = getUsersCollection(db);
      const userSettingsCollection = getUserSettingsCollection(db);
      const client = axios.create({
        baseURL: "https://api.github.com",
        headers: {
          Authorization: `Bearer  ${github.token.access_token}`
        }
      });
      const userData = await client.get<{
        name: string;
        id: string;
        login: string;
      }>("/user");
      const emailData = await client.get<
        Array<{
          email: string;
          primary: boolean;
        }>
      >("/user/emails");
      const primaryEmail =
        emailData.data.filter((email) => email.primary)[0].email ?? userData.data.login;
      const user = await users.findOne({ email: primaryEmail });
      const existingUser = user && user.external?.github?.id === userData.data.id;

      if (existingUser) {
        await createSession({ req, res, db, fastify }, `${user._id}`);

        return res.redirect("/");
      } else {
        const newUser = {
          _id: new ObjectId(),
          email: primaryEmail,
          username: userData.data.name.toLowerCase().replace(/-/g, "_").slice(0, 20),
          salt: await generateSalt(),
          external: {
            github: { id: userData.data.id }
          }
        };

        await users.insertOne(newUser);

        const { workspaceId, contentPieceId } = await createWorkspace(newUser, fastify, {
          newUser: true,
          plan:
            state
              .split(";")
              .find((part) => part.startsWith("plan:"))
              ?.split(":")[1] || "personal"
        });

        await userSettingsCollection.insertOne({
          _id: new ObjectId(),
          userId: newUser._id,
          codeEditorTheme: "auto",
          uiTheme: "auto",
          accentColor: "energy",
          currentWorkspaceId: workspaceId
        });
        await createSession({ req, res, db, fastify }, `${newUser._id}`);

        return res.redirect(`/${contentPieceId ? "editor/" : ""}${contentPieceId || ""}`);
      }
    } catch (error) {
      fastify.log.error(error);

      return res.redirect("/auth");
    }
  });
  fastify.register(fastifyOAuth2, oAuthConfig.github);
};
const OAuthPlugin = createPlugin(async (fastify) => {
  if (fastify.hostConfig.githubOAuth) {
    registerGitHubOAuth(fastify);
  }
});

export { OAuthPlugin };
