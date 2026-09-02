import { configSchema } from "#backend/lib/config-schema";

const baseConfig = configSchema.parse({ ...process.env });
const HTTP_PROTOCOL = baseConfig.PUBLIC_SECURE ? "https" : "http";
const config = {
  ...baseConfig,
  PUBLIC_API_URL: `${HTTP_PROTOCOL}://${baseConfig.PUBLIC_API_HOST}`,
  PUBLIC_APP_URL: `${HTTP_PROTOCOL}://${baseConfig.PUBLIC_APP_HOST}`
};

export { config };
