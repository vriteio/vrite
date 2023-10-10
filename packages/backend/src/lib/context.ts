import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Db } from "mongodb";

interface FastifyContext {
  fastify: FastifyInstance;
  req: FastifyRequest;
  res: FastifyReply;
}
interface Context extends FastifyContext {
  db: Db;
}

const createFastifyContext = (
  { req, res }: CreateFastifyContextOptions,
  fastify: FastifyInstance
): FastifyContext => {
  return { req, res, fastify };
};
const createContext = (
  { req, res }: CreateFastifyContextOptions,
  fastify: FastifyInstance
): Context => {
  const { db } = fastify.mongo;

  if (!db) {
    throw new Error("Database not connected");
  }

  return {
    ...createFastifyContext({ req, res }, fastify),
    db
  };
};

export { createContext, createFastifyContext };
export type { FastifyContext, Context };
