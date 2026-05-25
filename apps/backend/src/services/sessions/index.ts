import { createSession } from "./create";
import { deleteSession } from "./delete";
import { getSession } from "./get";

const Session = {
  create: createSession,
  delete: deleteSession,
  get: getSession
};

export { Session };
export type { SessionData } from "./session-data";
