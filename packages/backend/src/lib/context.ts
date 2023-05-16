import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Db } from "mongodb";

interface Context {
  fastify: FastifyInstance;
  req: FastifyRequest;
  res: FastifyReply;
  db: Db;
}

const createContext = (
  { req, res }: CreateFastifyContextOptions,
  fastify: FastifyInstance
): Context => {
  const { db } = fastify.mongo;

  if (!db) {
    throw new Error("Database not connected");
  }

  return { req, res, db, fastify };
};

export { createContext };
export type { Context };
