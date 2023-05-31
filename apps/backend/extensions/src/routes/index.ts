import { devRouter } from "./dev";
import { router } from "@vrite/backend";

const extensionsRouter = router({
  dev: devRouter
});

type Router = typeof extensionsRouter;

export { extensionsRouter };
export type { Router };
