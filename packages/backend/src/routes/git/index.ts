import { githubRouter } from "./github";
import { router } from "#lib/trpc";

const gitRouter = router({
  github: githubRouter
});

export { gitRouter };
