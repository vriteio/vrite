import { devRouter } from "./dev";
import { hashnodeRouter } from "./hashnode";
import { gptRouter } from "./gpt";
import { mediumRouter } from "./medium";
import { docusaurusRouter } from "./docusaurus";
import { router } from "@vrite/backend";

const extensionsRouter = router({
  dev: devRouter,
  hashnode: hashnodeRouter,
  medium: mediumRouter,
  gpt: gptRouter,
  docusaurus: docusaurusRouter
});

type Router = typeof extensionsRouter;

export { extensionsRouter };
export type { Router };
