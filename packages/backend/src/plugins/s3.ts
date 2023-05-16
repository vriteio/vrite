import { publicPlugin } from "../lib/plugin";
import { S3Client } from "@aws-sdk/client-s3";

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Client;
  }
}

const s3Plugin = publicPlugin(async (fastify) => {
  const s3Client = new S3Client({
    endpoint: fastify.config.S3_ENDPOINT,
    forcePathStyle: false,
    region: fastify.config.S3_REGION,
    credentials: {
      accessKeyId: fastify.config.S3_ACCESS_KEY,
      secretAccessKey: fastify.config.S3_SECRET_KEY
    }
  });

  fastify.decorate("s3", s3Client);
});

export { s3Plugin };
