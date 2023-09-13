import { devRouter } from "./dev";
import { hashnodeRouter } from "./hashnode";
import { gptRouter } from "./gpt";
import { mediumRouter } from "./medium";
import { router } from "@vrite/backend";

const extensionsRouter = router({
  dev: devRouter,
  hashnode: hashnodeRouter,
  medium: mediumRouter,
  gpt: gptRouter
});

type Router = typeof extensionsRouter;

export { extensionsRouter };
export type { Router };
