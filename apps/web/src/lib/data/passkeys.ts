import { createMutation } from "@tanstack/solid-query";
import { query } from "@solidjs/router";
import { authClient } from "#web/lib/api";
import { useNotify } from "#web/context/notifications";
import { settleBulkAction } from "#web/lib/primitives";
import { getPasskeyErrorMessage } from "#web/lib/validation";

interface RefreshInput {
  refresh(onRevalidated?: () => void): void;
}

const passkeysQuery = query(async () => {
  const { data, error } = await authClient.passkey.listUserPasskeys();
  return error || !data ? [] : data;
}, "passkeys");

const isSessionNotFreshError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "SESSION_NOT_FRESH";

const useAddPasskeyMutation = (
  input: RefreshInput & {
    name(): string;
    onVerificationRequired?(retry: () => void): void;
  }
) => {
  const notify = useNotify();
  let startedAt = 0;
  const mutation = createMutation(() => ({
    mutationFn: async () => {
      startedAt = Date.now();
      const { error, data } = await authClient.passkey.addPasskey({ name: input.name() });

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      input.refresh(() => mutation.reset());
      notify({ text: "Passkey added successfully", type: "success" });
    },
    onError: (error) => {
      console.error(error);
      if (isSessionNotFreshError(error) && input.onVerificationRequired) {
        input.onVerificationRequired(() => mutation.mutate());
        return;
      }
      notify({
        text: getPasskeyErrorMessage(error, "register", Date.now() - startedAt),
        type: "error"
      });
    }
  }));
  return mutation;
};

const useDeletePasskeysMutation = (
  input: RefreshInput & { onVerificationRequired(retry: () => void): void }
) => {
  const notify = useNotify();
  const mutation = createMutation(() => ({
    mutationFn: (variables: { ids: string[] }) =>
      settleBulkAction(variables.ids, async (id) => {
        const { error } = await authClient.passkey.deletePasskey({ id });
        if (error) throw error;
      }),
    onSuccess: (result) => {
      const verificationFailures = result.failed.filter(({ error }) =>
        isSessionNotFreshError(error)
      );
      const failed = result.failed.filter(({ error }) => !isSessionNotFreshError(error));
      failed.forEach(({ error }) => console.error(error));
      input.refresh(() => {
        mutation.reset();
        if (result.successful.length) {
          notify({
            text:
              result.successful.length > 1
                ? `${result.successful.length} passkeys deleted`
                : "Passkey deleted",
            type: "success"
          });
        }
        if (failed.length) {
          notify({
            text:
              failed.length > 1
                ? `${failed.length} passkeys failed to delete`
                : "Failed to delete passkey",
            type: "error"
          });
        }
        if (verificationFailures.length) {
          const ids = verificationFailures.map(({ item }) => item);
          input.onVerificationRequired(() => mutation.mutate({ ids }));
        }
      });
    }
  }));
  return mutation;
};

const useRenamePasskeyMutation = (input: RefreshInput) => {
  const notify = useNotify();
  const mutation = createMutation(() => ({
    mutationFn: async (variables: { id: string; name: string }) => {
      const { error } = await authClient.passkey.updatePasskey(variables);
      if (error) throw error;
    },
    onSuccess: () => input.refresh(() => mutation.reset()),
    onError: (error, { name }) => {
      console.error(error);
      notify({ text: `Failed to rename passkey to "${name}"`, type: "error" });
    }
  }));
  return mutation;
};

export {
  isSessionNotFreshError,
  passkeysQuery,
  useAddPasskeyMutation,
  useDeletePasskeysMutation,
  useRenamePasskeyMutation
};
