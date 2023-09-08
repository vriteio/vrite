import axios from "axios";
import fastifyOAuth2, { FastifyOAuth2Options, OAuth2Namespace } from "@fastify/oauth2";
import { ObjectId } from "mongodb";
import { FastifyInstance } from "fastify";
import { publicPlugin } from "#lib/plugin";
import { generateSalt } from "#lib/hash";
import { createSession } from "#lib/session";
import { createWorkspace } from "#lib/workspace";
import { getUsersCollection } from "#database/users";
import { getUserSettingsCollection } from "#database";

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
      callbackUri: `${fastify.config.PUBLIC_APP_URL}/login/github/callback`
    }
  };

  fastify.get("/login/github/callback", async (req, res) => {
    try {
      const db = fastify.mongo.db!;
      const github = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
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

        const workspaceId = await createWorkspace(newUser, fastify, {
          defaultContent: true
        });

        await userSettingsCollection.insertOne({
          _id: new ObjectId(),
          userId: newUser._id,
          codeEditorTheme: "dark",
          uiTheme: "auto",
          accentColor: "energy",
          currentWorkspaceId: workspaceId
        });
        await createSession({ req, res, db, fastify }, `${newUser._id}`);
      }

      return res.redirect("/");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);

      return res.redirect("/auth");
    }
  });
  fastify.register(fastifyOAuth2, oAuthConfig.github);
};
const OAuthPlugin = publicPlugin(async (fastify) => {
  if (fastify.hostConfig.githubOAuth) {
    registerGitHubOAuth(fastify);
  }
});

export { OAuthPlugin };
