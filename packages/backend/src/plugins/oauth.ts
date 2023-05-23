import axios from "axios";
import fastifyOAuth2, { FastifyOAuth2Options, OAuth2Namespace } from "@fastify/oauth2";
import { ObjectId } from "mongodb";
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

const oAuth2Plugin = publicPlugin(async (fastify) => {
  const oAuthConfig: Record<string, FastifyOAuth2Options> = {
    github: {
      name: "githubOAuth2",
      scope: ["read:user", "user:email"],
      credentials: {
        client: {
          id: fastify.config.GITHUB_CLIENT_ID,
          secret: fastify.config.GITHUB_CLIENT_SECRET
        },
        auth: fastifyOAuth2.GITHUB_CONFIGURATION
      },
      startRedirectPath: "/login/github",
      callbackUri: `${fastify.config.CALLBACK_DOMAIN}/login/github/callback`
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

      let user = await users.findOne({ email: primaryEmail });

      const existingUser = Boolean(user);

      if (user && user.external?.github?.accessToken !== github.token.access_token) {
        await users.updateOne(
          { _id: user._id },
          {
            $set: {
              "external.github": {
                id: userData.data.id,
                accessToken: github.token.access_token
              }
            }
          }
        );
        user.external = {
          ...user.external,
          github: { id: userData.data.id, accessToken: github.token.access_token }
        };
      } else {
        user = {
          _id: new ObjectId(),
          email: primaryEmail,
          username: userData.data.name.toLowerCase().replace(/-/g, "_").slice(0, 20),
          salt: await generateSalt(),
          external: {
            github: { id: userData.data.id, accessToken: github.token.access_token }
          }
        };
        await users.insertOne(user);
      }

      if (!existingUser) {
        const workspaceId = await createWorkspace(user, fastify.mongo.db!);

        await userSettingsCollection.insertOne({
          _id: new ObjectId(),
          userId: user._id,
          codeEditorTheme: "dark",
          uiTheme: "auto",
          accentColor: "energy",
          currentWorkspaceId: workspaceId
        });
      }

      await createSession({ req, res, db, fastify }, `${user._id}`);

      return res.redirect("/");
    } catch (error) {
      console.log(error);

      return res.redirect("/auth");
    }
  });
  fastify.register(fastifyOAuth2, oAuthConfig.github);
});

export { oAuth2Plugin };
