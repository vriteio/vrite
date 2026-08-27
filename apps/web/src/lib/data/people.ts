import { createMutation } from "@tanstack/solid-query";
import { query, revalidate } from "@solidjs/router";
import { client, type Group, type Permission } from "#web/lib/api";
import { useNotify } from "#web/context/notifications";

interface GroupDetails extends Group {
  invitationIDs: string[];
  memberIDs: string[];
}

interface RestrictedAssignmentsQueryInput {
  collectionID: string;
}

interface RoleMutationsInput {
  navigateToPeople(): void;
  setDuplicateNameError(message: string): void;
}

const membershipsQuery = query(() => client.memberships.list(), "memberships");
const invitesQuery = query(() => client.memberships.listInvites(), "invites");
const rolesQuery = query(() => client.roles.list(), "roles");
const groupsQuery = query(() => client.groups.list(), "groups");
const restrictedAssignmentsQuery = query((input: RestrictedAssignmentsQueryInput) => {
  return client.collections.listRestrictedAssignments({ id: input.collectionID });
}, "restricted-assignments");

const isDuplicateRoleNameError = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ROLE_NAME_DUPLICATE"
  );
};

const useRoleMutations = (input: RoleMutationsInput) => {
  const notify = useNotify();
  const handleError = (error: unknown, action: "create" | "update") => {
    console.error(error);
    const duplicate = isDuplicateRoleNameError(error);
    if (duplicate) input.setDuplicateNameError("A role with this name already exists");
    notify({
      type: "error",
      text: duplicate ? "A role with this name already exists" : `Failed to ${action} role`
    });
  };
  const createRoleMutation = createMutation(() => ({
    mutationFn: (variables: { name: string; permissions: Permission[] }) =>
      client.roles.create(variables),
    onSuccess: async () => {
      await revalidate(rolesQuery.key);
      notify({ type: "success", text: "Role created" });
      input.navigateToPeople();
    },
    onError: (error) => handleError(error, "create")
  }));
  const updateRoleMutation = createMutation(() => ({
    mutationFn: (variables: { id: string; name: string; permissions: Permission[] }) =>
      client.roles.update(variables),
    onSuccess: async () => {
      await revalidate([rolesQuery.key, membershipsQuery.key]);
      notify({ type: "success", text: "Role updated" });
      input.navigateToPeople();
    },
    onError: (error) => handleError(error, "update")
  }));

  return { createRoleMutation, updateRoleMutation };
};

export {
  groupsQuery,
  invitesQuery,
  membershipsQuery,
  restrictedAssignmentsQuery,
  rolesQuery,
  useRoleMutations
};
export type { GroupDetails, RestrictedAssignmentsQueryInput };
