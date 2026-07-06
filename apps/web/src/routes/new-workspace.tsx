import { useNavigate } from "@solidjs/router";
import { Component, createMemo, createSignal } from "solid-js";
import { AnimatedGradientCard } from "#web/components/animated-gradient-card";
import { Button, IconButton, Input } from "@andesine/components";
import { client, setCurrentWorkspaceID } from "#web/lib/client";

const NewWorkspacePage: Component = () => {
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [error, setError] = createSignal("");
  const [creating, setCreating] = createSignal(false);
  const loading = createMemo(() => creating());

  const handleCreate = async () => {
    if (creating()) return;

    const trimmedName = name().trim();

    if (!trimmedName) {
      setError("Workspace name is required");

      return;
    }

    setError("");
    setCreating(true);

    try {
      const workspace = await client.workspaces.create({ name: trimmedName });

      setCurrentWorkspaceID(workspace.id);
      navigate(`/${workspace.id}/`, { replace: true });
    } catch (createError) {
      setError("Failed to create workspace");
      setCreating(false);
    }
  };

  return (
    <div class="flex flex-row-reverse h-full w-full">
      <div class="dots-background absolute mask-edge-fading-16" />
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
          <div class="absolute h-full w-full top-0 left-0 mask-edge-fading-4 lg:mask-edge-fading-24 bg-gray-100 dark:bg-gray-850 rounded-2xl" />
          <div class="relative flex flex-col w-80 gap-4">
            <div>
              <span class="text-2xl font-semibold">New workspace</span>
              <div class="text-gray-400 dark:text-gray-500 leading-5 text-sm">
                Give your workspace a name to get started.
              </div>
            </div>
            <div class="flex flex-col gap-2.5">
              <Input
                placeholder="Workspace name"
                value={name()}
                setValue={setName}
                onEnter={handleCreate}
              />
              {error() && <div class="text-red-500 text-sm">{error()}</div>}
              <Button class="w-full" color="primary" onClick={handleCreate} loading={loading()}>
                Create workspace
              </Button>
            </div>
            <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400 dark:text-gray-500">
              <IconButton
                icon="i-lucide:arrow-left"
                label="Back"
                variant="text"
                size="small"
                text="soft"
                onClick={() => {
                  // Navigate back — go to / which will redirect to the last workspace
                  navigate("/");
                }}
              />
            </div>
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
