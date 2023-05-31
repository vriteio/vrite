import { devPublishRouter } from "./dev-publish";
import { router } from "@vrite/backend";

const extensionsRouter = router({
  devPublish: devPublishRouter
});

type Router = typeof extensionsRouter;

export { extensionsRouter };
export type { Router };
