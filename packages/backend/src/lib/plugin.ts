import { FastifyPluginAsync } from "fastify";

type PublicPlugin = { [key: symbol]: boolean } & FastifyPluginAsync;

const publicPlugin = (plugin: FastifyPluginAsync): PublicPlugin => {
  const publicPlugin = plugin as PublicPlugin;

  publicPlugin[Symbol.for("skip-override")] = true;

  return publicPlugin;
};

export { publicPlugin };
