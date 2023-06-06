import { router } from "@vrite/backend";
import { devRouter } from "./dev";
import { hashnodeRouter } from "./hashnode";
import { gptRouter } from "./gpt";

const extensionsRouter = router({
  dev: devRouter,
  hashnode: hashnodeRouter,
  gpt: gptRouter
});

type Router = typeof extensionsRouter;

export { extensionsRouter };
export type { Router };
