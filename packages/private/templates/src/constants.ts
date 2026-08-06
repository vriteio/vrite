// TODO: Update links after rebranding is finalized
const HTTP_PROTOCOL = process.env.PUBLIC_SECURE === "true" ? "https" : "http";
const PUBLIC_APP_HOST = process.env.PUBLIC_APP_HOST || "localhost:3000";
const PUBLIC_APP_URL = `${HTTP_PROTOCOL}://${PUBLIC_APP_HOST}`;
const X_URL = "https://x.com/vriteio";
const LINKEDIN_URL = "https://www.linkedin.com/company/vrite";
const GITHUB_URL = "https://github.com/vriteio/vrite";

export { HTTP_PROTOCOL, PUBLIC_APP_HOST, PUBLIC_APP_URL, X_URL, LINKEDIN_URL, GITHUB_URL };
