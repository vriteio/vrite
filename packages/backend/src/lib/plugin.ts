import { FastifyPluginAsync } from "fastify";

type Plugin = { [key: symbol]: boolean } & FastifyPluginAsync;

const createPlugin = (plugin: FastifyPluginAsync): Plugin => {
  const typedPlugin = plugin as Plugin;

  typedPlugin[Symbol.for("skip-override")] = true;

  return typedPlugin;
};

export { createPlugin };
