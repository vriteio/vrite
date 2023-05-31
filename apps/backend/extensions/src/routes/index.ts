import { router } from "@vrite/backend";
import { devRouter } from "./dev";
import { hashnodeRouter } from "./hashnode";

const extensionsRouter = router({
  dev: devRouter,
  hashnode: hashnodeRouter
});

type Router = typeof extensionsRouter;

export { extensionsRouter };
export type { Router };
