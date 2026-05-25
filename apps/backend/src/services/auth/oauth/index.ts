import { GitHubOAuth } from "./github";
import { GoogleOAuth } from "./google";

const OAuth = {
  GitHub: GitHubOAuth,
  Google: GoogleOAuth
};

export { OAuth };
