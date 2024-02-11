import { createServer, databasePlugin, pubSubPlugin, billingPlugin } from "@vrite/backend";

(async () => {
  await createServer(async (server) => {
    await server.register(databasePlugin);
    await server.register(pubSubPlugin);
    await server.register(billingPlugin);

    const usageLogs = await server.billing.usage.getLogs();

    await Promise.all(
      Object.keys(usageLogs).map(async (workspaceId) => {
        await server.billing.usage.record(workspaceId);
      })
    );
    process.exit(0);
  });
})();
