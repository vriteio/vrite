import { createAsync, query, revalidate, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { type Component, createSignal, Show } from "solid-js";
import { AnimatedGradientCard } from "#web/components/animated-gradient-card";
import { IconButton, Input, Tooltip } from "@andesine/components";
import { client } from "#web/lib/api";
import { getPostAuthRedirectPath } from "#web/lib/navigation";
import { createMutation } from "@tanstack/solid-query";
import { DotsBackground } from "#web/components/dots-background";

const workspacesQuery = query(() => client.workspaces.list(), "workspaces");

const NewWorkspacePage: Component = () => {
  const navigate = useNavigate();
  const workspaces = createAsync(() => workspacesQuery());
  const [name, setName] = createSignal("");
  const [error, setError] = createSignal("");
  const createWorkspaceMutation = createMutation(() => ({
    mutationFn: (input: { name: string }) => {
      return client.workspaces.create(input);
    }
  }));
  const handleCreate = async () => {
    if (createWorkspaceMutation.isPending) return;

    const trimmedName = name().trim();

    if (!trimmedName) {
      setError("Workspace name is required");

      return;
    }

    setError("");

    try {
      const workspace = await createWorkspaceMutation.mutateAsync({ name: trimmedName });

      await revalidate("workspaces");
      navigate(`/${workspace.id}/`, { replace: true });
    } catch {
      setError("Failed to create workspace");
    }
  };
  const goBack = async () => {
    const fallbackWorkspaceID = workspaces()?.[0]?.id;
    const redirectPath = await getPostAuthRedirectPath();

    navigate(
      redirectPath === "/new-workspace" && fallbackWorkspaceID
        ? `/${fallbackWorkspaceID}/`
        : redirectPath
    );
  };

  return (
    <div class="flex flex-row-reverse h-full w-full">
      <Title>Create a workspace | Andesine</Title>
      <DotsBackground class="absolute mask-edge-fading-16" />
      <div class="hidden lg:block flex-1 p-3 max-w-5/12">
        <AnimatedGradientCard class="h-full w-full rounded-2xl">
          <div class="flex flex-col items-center text-center max-w-xl relative p-4">
            <div class="rounded-md font-medium px-1.5 bg-gray-100 bg-opacity-30 backdrop-blur-md border-white absolute -top-8">
              Getting started
            </div>
            <div class="text-2xl">
              <p>
                Create a workspace to organize your content. You can invite team members and assign
                roles later from workspace settings.
              </p>
            </div>
          </div>
        </AnimatedGradientCard>
      </div>
      <div class="flex-1 relative flex justify-center items-center">
        <div class="p-4 lg:p-24 relative">
          <div class="absolute h-full w-full top-0 left-0 mask-edge-fading-4 lg:mask-edge-fading-24 bg-gray-100 rounded-2xl" />
          <div class="relative flex flex-col w-80 max-w-full">
            <div>
              <span class="text-2xl font-semibold">New workspace</span>
              <div class="text-gray-400 leading-5 text-sm">
                Give your workspace a name to get started.
              </div>
            </div>
            <div class="flex flex-col my-4 gap-2.5">
              <Input
                placeholder="Workspace name"
                value={name()}
                setValue={setName}
                onEnter={handleCreate}
                labelWrapperClass="flex"
                slotWrapperClass="gap-1.5"
                slot={() => (
                  <Tooltip content="Continue">
                    <IconButton
                      disabled={!name().trim() || createWorkspaceMutation.isPending}
                      icon="i-lucide:arrow-right"
                      color="primary"
                      onClick={handleCreate}
                    />
                  </Tooltip>
                )}
              />
              {error() && <div class="text-red-500 text-sm">{error()}</div>}
            </div>
            <Show when={(workspaces() || []).length > 0}>
              <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400">
                <span>Already have a workspace?</span>
                <IconButton
                  icon="i-lucide:arrow-left"
                  iconProps={{ class: "h-4 w-4" }}
                  variant="text"
                  text="primary"
                  color="primary"
                  size="small"
                  label={() => <span>Go back</span>}
                  hover="underline"
                  class="gap-1 inline-flex font-medium px-0 -mt-1"
                  onClick={goBack}
                ></IconButton>
              </div>
            </Show>
          </div>
        </div>
      </div>
      <div class="flex items-center font-bold text-3xl top-4 left-4 absolute">
        <div class="h-8 w-8 i-andesine:logo bg-gradient-to-tr" />
        ndesine
      </div>
    </div>
  );
};

export default NewWorkspacePage;
