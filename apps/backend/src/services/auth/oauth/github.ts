import {
  GitHub as GitHubOAuthClient,
  ArcticFetchError,
  generateState,
  OAuth2RequestError
} from "arctic";
import { config } from "#backend/lib/config";
import { status } from "elysia";
import { Octokit } from "octokit";

const githubOAuthClient = new GitHubOAuthClient(
  config.GITHUB_CLIENT_ID || "",
  config.GITHUB_CLIENT_SECRET || "",
  "http://localhost:3333/auth/github/callback"
);
const signInWithGitHub = async () => {
  const state = generateState();
  const scopes = ["read:user", "user:email"];
  const url = githubOAuthClient.createAuthorizationURL(state, scopes);

  return { redirectURL: `${url}`, state };
};
const handleGitHubCallback = async ({
  recieved,
  stored
}: {
  recieved: {
    code?: string;
    state?: string;
  };
  stored: {
    state?: string;
  };
}) => {
  if (!recieved.code || !stored.state || recieved.state !== stored.state) {
    throw status("Bad Request");
  }

  try {
    const tokens = await githubOAuthClient.validateAuthorizationCode(recieved.code);
    const accessToken = tokens.accessToken();
    const octokit = new Octokit({ auth: accessToken });
    const profile = await octokit.rest.users.getAuthenticated();
    const emails = await octokit.rest.users.listEmailsForAuthenticatedUser();

    return {
      email: emails.data[0].email,
      username: profile.data.login
    };
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      // Invalid authorization code, credentials, or redirect URI
      const code = err.code;
      console.error(code);
    }
    if (err instanceof ArcticFetchError) {
      const cause = err.cause;
      console.error(cause);
    }
    throw status("Internal Server Error");
  }
};
const GitHubOAuth = {
  signIn: signInWithGitHub,
  handleCallback: handleGitHubCallback
};

export { GitHubOAuth };
