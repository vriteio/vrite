import { createMutation } from "@tanstack/solid-query";
import { query, revalidate } from "@solidjs/router";
import { client, type KeyPermission } from "#web/lib/api";
import { useNotify } from "#web/context/notifications";

interface KeyMutationsInput {
  keyID(): string | null;
  navigateToAPI(): void;
  onCreated(rawKey: string): void;
}

const apiKeysQuery = query(() => client.keys.list(), "api-keys");
const apiKeyQuery = query(
  (input: { keyID: string }) => client.keys.get({ id: input.keyID }),
  "api-key"
);

const useKeyMutations = (input: KeyMutationsInput) => {
  const notify = useNotify();
  const createKeyMutation = createMutation(() => ({
    mutationFn: (variables: { name: string; permissions: KeyPermission[] }) =>
      client.keys.create(variables),
    onSuccess: (data) => {
      input.onCreated(data.rawKey);
      void revalidate(apiKeysQuery.key);
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Failed to create key" });
    }
  }));
  const updateKeyMutation = createMutation(() => ({
    mutationFn: (variables: { id: string; name: string; permissions: KeyPermission[] }) =>
      client.keys.update(variables),
    onSuccess: () => {
      const keyID = input.keyID();
      void revalidate([apiKeysQuery.key, ...(keyID ? [apiKeyQuery.keyFor({ keyID })] : [])]);
      input.navigateToAPI();
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Failed to update key" });
    }
  }));

  return { createKeyMutation, updateKeyMutation };
};

export { apiKeyQuery, apiKeysQuery, useKeyMutations };
