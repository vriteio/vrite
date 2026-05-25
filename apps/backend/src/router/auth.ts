import Elysia, { redirect, t } from "elysia";
import { userType } from "#backend/db";
import { sendEmail } from "#backend/lib/email";
import { config } from "#backend/lib/config";
import { Auth, Session, Users, Verification, Workspaces } from "#backend/services";

const cookie = t.Cookie(
  {
    session: t.Optional(t.String({ description: "Session ID" })),
    google_oauth_state: t.Optional(t.String({ description: "Google OAuth State" })),
    google_oauth_code_verifier: t.Optional(t.String({ description: "Google OAuth Code Verifier" })),
    github_oauth_state: t.Optional(t.String({ description: "GitHub OAuth State" }))
  },
  {
    httpOnly: true,
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? ".andesine.app" : "localhost",
    secure: process.env.NODE_ENV === "production"
  }
);
const authRouterPlugin = new Elysia({
  prefix: "/auth",
  cookie: {
    secrets: config.COOKIE_SECRET,
    sign: ["session"]
  }
})
  .post(
    "/register",
    async ({ body }) => {
      const { emailVerificationCode } = await Users.create(body);

      sendEmail(body.email, "verify-email", { code: emailVerificationCode });
    },
    {
      response: t.Void(),
      body: t.Intersect([
        t.Pick(userType, ["email", "username"]),
        t.Object({
          password: t.String({ description: "Password", minLength: 8, maxLength: 128 })
        })
      ])
    }
  )
  .post(
    "/verify-email",
    async ({ body, cookie }) => {
      const { userID } = await Verification.verifyEmail(body);
      const { workspaceID } = await Workspaces.create({ adminUserID: userID });
      const { sessionID, expireAt } = await Session.create({ userID, workspaceID });

      cookie.session.set({
        value: sessionID,
        expires: expireAt
      });
    },
    {
      response: t.Void(),
      body: t.Object({
        email: t.String({ description: "Email", format: "email" }),
        otp: t.String({ description: "Verification OTP" })
      }),
      cookie: t.Cookie(
        {
          session: t.Optional(t.String({ description: "Session ID" }))
        },
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production"
        }
      )
    }
  )
  .post(
    "/login",
    async ({ body, cookie }) => {
      const { userID } = await Auth.login(body);
      const { sessionID, expireAt } = await Session.create({ userID });

      cookie.session.set({
        value: sessionID,
        expires: expireAt
      });
    },
    {
      response: t.Void(),
      body: t.Object({
        email: t.String({ description: "Email", format: "email" }),
        password: t.String({ description: "Password", minLength: 8, maxLength: 128 })
      }),
      cookie
    }
  )
  .post(
    "/logout",
    async ({ cookie }) => {
      const sessionID = cookie.session.value;

      if (sessionID) {
        await Session.delete(sessionID);
        cookie.session.remove();
      }
    },
    {
      response: t.Void(),
      cookie
    }
  )
  .get(
    "/google",
    async ({ cookie, redirect }) => {
      const { redirectURL, codeVerifier, state } = await Auth.OAuth.Google.signIn();

      cookie.google_oauth_code_verifier.set({ value: codeVerifier, maxAge: 60 * 10 });
      cookie.google_oauth_state.set({ value: state, maxAge: 60 * 10 });

      return redirect(`${redirectURL}`);
    },
    { cookie }
  )
  .get(
    "/google/callback",
    async ({ cookie, query }) => {
      const storedState = cookie.google_oauth_state.value;
      const storedCodeVerifier = cookie.google_oauth_code_verifier.value;
      const userProfile = await Auth.OAuth.Google.handleCallback({
        recieved: query,
        stored: { state: storedState, codeVerifier: storedCodeVerifier }
      });
      const { userID, existingUser } = await Users.create({
        email: userProfile.email,
        username: userProfile.username,
        emailVerification: false,
        existingUser: "return"
      });

      let newWorkspaceID: string | undefined;

      if (!existingUser) {
        const { workspaceID } = await Workspaces.create({ adminUserID: userID });

        newWorkspaceID = workspaceID;
      }

      const { sessionID, expireAt } = await Session.create({ userID, workspaceID: newWorkspaceID });

      cookie.session.set({
        value: sessionID,
        expires: expireAt
      });
      cookie.google_oauth_state.remove();
      cookie.google_oauth_code_verifier.remove();

      return redirect("http://localhost:3000");
    },
    {
      query: t.Object({
        code: t.String({ description: "Google OAuth Code" }),
        state: t.String({ description: "Google OAuth State" })
      }),
      cookie
    }
  )
  .get(
    "/github",
    async ({ cookie, redirect }) => {
      const { redirectURL, state } = await Auth.OAuth.GitHub.signIn();

      cookie.github_oauth_state.set({ value: state, maxAge: 60 * 10 });

      return redirect(`${redirectURL}`);
    },
    { cookie }
  )
  .get(
    "/github/callback",
    async ({ cookie, query }) => {
      const storedState = cookie.github_oauth_state.value;
      const userProfile = await Auth.OAuth.GitHub.handleCallback({
        recieved: query,
        stored: { state: storedState }
      });
      const { userID, existingUser } = await Users.create({
        email: userProfile.email,
        username: userProfile.username,
        emailVerification: false,
        existingUser: "return"
      });

      let newWorkspaceID: string | undefined;

      if (!existingUser) {
        const { workspaceID } = await Workspaces.create({ adminUserID: userID });

        newWorkspaceID = workspaceID;
      }

      const { sessionID, expireAt } = await Session.create({ userID, workspaceID: newWorkspaceID });

      cookie.session.set({
        value: sessionID,
        expires: expireAt
      });
      cookie.google_oauth_state.remove();
      cookie.google_oauth_code_verifier.remove();

      return redirect("http://localhost:3000");
    },
    {
      query: t.Object({
        code: t.String({ description: "GitHub OAuth Code" }),
        state: t.String({ description: "GitHub OAuth State" })
      }),
      cookie
    }
  )
  .get("/is-signed-in", async ({ cookie }) => {
    const sessionID = cookie.session.value;

    if (sessionID) {
      const sessionData = await Session.get(sessionID);

      return { signedIn: Boolean(sessionData) };
    }

    return { signedIn: false };
  });

export { authRouterPlugin };
