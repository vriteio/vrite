import {
  Google as GoogleOAuthClient,
  ArcticFetchError,
  generateCodeVerifier,
  generateState,
  OAuth2RequestError
} from "arctic";
import { config } from "#backend/lib/config";
import { status } from "elysia";

interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  hd: string;
}

const googleOAuthClient = new GoogleOAuthClient(
  config.GOOGLE_CLIENT_ID || "",
  config.GOOGLE_CLIENT_SECRET || "",
  "http://localhost:3333/auth/google/callback"
);
const signInWithGoogle = async () => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const scopes = ["openid", "profile", "email"];
  const url = googleOAuthClient.createAuthorizationURL(state, codeVerifier, scopes);

  return { redirectURL: `${url}`, state, codeVerifier };
};
const handleGoogleCallback = async ({
  recieved,
  stored
}: {
  recieved: {
    code?: string;
    state?: string;
  };
  stored: {
    state?: string;
    codeVerifier?: string;
  };
}) => {
  if (!recieved.code || !stored.state || !stored.codeVerifier || recieved.state !== stored.state) {
    throw status("Bad Request");
  }

  try {
    const tokens = await googleOAuthClient.validateAuthorizationCode(
      recieved.code,
      stored.codeVerifier
    );
    const accessToken = tokens.accessToken();
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const userInfo: GoogleUserInfo = await response.json();

    return {
      email: userInfo.email,
      username: userInfo.name
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
const GoogleOAuth = {
  signIn: signInWithGoogle,
  handleCallback: handleGoogleCallback
};

export { GoogleOAuth };
