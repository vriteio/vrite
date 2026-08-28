import { hasAuthorizationRequirements } from "./permissions";
import type { SessionData } from "./session";

const isWorkspaceEventVisible = (
  auth: SessionData,
  event: {
    action: string;
  }
) => {
  if (event.action.startsWith("entry:")) {
    return hasAuthorizationRequirements(auth, { session: true, key: ["read:entries"] });
  }

  if (event.action.startsWith("collection:")) {
    return hasAuthorizationRequirements(auth, { session: true, key: ["read:collections"] });
  }

  if (event.action.startsWith("publishing:")) {
    return hasAuthorizationRequirements(auth, {
      session: true,
      key: ["read:publishing"]
    });
  }

  if (event.action.startsWith("version:")) {
    return hasAuthorizationRequirements(auth, {
      session: true,
      key: ["read:versions"]
    });
  }

  if (event.action.startsWith("membership:")) {
    return hasAuthorizationRequirements(auth, {
      session: ["workspace"],
      key: ["read:memberships"]
    });
  }

  if (event.action.startsWith("invite:")) {
    return hasAuthorizationRequirements(auth, {
      session: ["workspace"],
      key: ["memberships"]
    });
  }

  if (event.action.startsWith("role:")) {
    return hasAuthorizationRequirements(auth, {
      session: ["workspace"],
      key: ["read:roles"]
    });
  }

  if (event.action.startsWith("group:")) {
    return hasAuthorizationRequirements(auth, { session: ["workspace"] });
  }

  if (event.action === "restricted-assignments:update") {
    return hasAuthorizationRequirements(auth, {
      session: ["restricted_collections"]
    });
  }

  if (event.action.startsWith("key:")) {
    return hasAuthorizationRequirements(auth, { session: ["read:api_keys"] });
  }

  if (event.action.startsWith("workspace:")) {
    return hasAuthorizationRequirements(auth, { session: true });
  }

  return false;
};

export { isWorkspaceEventVisible };
