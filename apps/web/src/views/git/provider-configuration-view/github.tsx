import { mdiChevronDown, mdiGithub, mdiUnfoldMoreHorizontal, mdiUnfoldMoreVertical } from "@mdi/js";
import { Component, For, Show, createMemo, createResource, createSignal } from "solid-js";
import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { Button, Dropdown, Heading, Icon, IconButton } from "#components/primitives";
import { breakpoints } from "#lib/utils";
import { useClient } from "#context";

interface GitHubConfigurationViewProps {
  setActionComponent(component: Component<{}> | null): void;
}

type Installation =
  RestEndpointMethodTypes["apps"]["listInstallationsForAuthenticatedUser"]["response"]["data"]["installations"][0];
type Repository =
  RestEndpointMethodTypes["apps"]["listInstallationReposForAuthenticatedUser"]["response"]["data"]["repositories"][0];
type Branch = RestEndpointMethodTypes["repos"]["listBranches"]["response"]["data"][0];

const GitHubConfigurationView: Component<GitHubConfigurationViewProps> = (props) => {
  const client = useClient();
  const [installationId, setInstallationId] = createSignal(0);
  const [selectedRepo, setSelectedRepo] = createSignal<{
    owner: string;
    name: string;
    id: number;
  } | null>(null);
  const [branchName, setBranchName] = createSignal("");
  const [installationDropdownOpened, setInstallationDropdownOpened] = createSignal(false);
  const [repositoryDropdownOpened, setRepositoryDropdownOpened] = createSignal(false);
  const [branchDropdownOpened, setBranchDropdownOpened] = createSignal(false);
  const [token, setToken] = createSignal("");
  const octokit = createMemo(() => {
    return new Octokit({ auth: token() });
  });
  const [installations] = createResource(
    token,
    async () => {
      if (!token()) return [];

      const response = await octokit().apps.listInstallationsForAuthenticatedUser({
        // eslint-disable-next-line camelcase
        per_page: 100
      });

      return response.data.installations;
    },
    { initialValue: [] }
  );
  const [repositories] = createResource(
    installationId,
    async () => {
      if (!token()) return [];

      const response = await octokit().apps.listInstallationReposForAuthenticatedUser({
        // eslint-disable-next-line camelcase
        installation_id: installationId(),
        // eslint-disable-next-line camelcase
        per_page: 100
      });

      return response.data.repositories;
    },
    { initialValue: [] }
  );
  const [branches] = createResource(
    selectedRepo,
    async () => {
      if (!token()) return [];

      const response = await octokit().repos.listBranches({
        owner: selectedRepo()!.owner,
        repo: selectedRepo()!.name
      });

      return response.data;
    },
    { initialValue: [] }
  );
  const retrievedToken =
    sessionStorage.getItem("github-token") || new URL(location.href).searchParams.get("token");

  if (retrievedToken) {
    const path =
      location.pathname + location.search.replace(/\b(token)=\w+/g, "").replace(/[?&]+$/, "");

    history.replaceState({}, "", path);
    sessionStorage.setItem("github-token", retrievedToken || "");
    setToken(retrievedToken);
  }

  props.setActionComponent(() => {
    return (
      <Button
        class="m-0"
        color="primary"
        disabled={!installationId() || !selectedRepo() || !branchName()}
        onClick={() => {
          client.git.github.configure.mutate({
            installationId: installationId(),
            repositoryId: selectedRepo()?.id || 0,
            repositoryName: selectedRepo()?.name || "",
            repositoryOwner: selectedRepo()?.owner || "",
            branchName: branchName()
          });
        }}
      >
        Save
      </Button>
    );
  });

  return (
    <div class="flex flex-col items-start w-full gap-2">
      <p class="prose text-gray-500 dark:text-gray-400 w-full">
        Authenticate with your GitHub account
      </p>
      <IconButton
        path={mdiGithub}
        class="m-0"
        label="Continue with GitHub"
        onClick={() => {
          window.location.replace("github/login");
        }}
      />
      <Show when={token()}>
        <Heading level={3}>Account</Heading>
        <p class="prose text-gray-500 dark:text-gray-400 w-full">
          Select the GitHub installation, user or organization.{" "}
          <a href="https://github.com/apps/vrite-io/installations/select_target">
            Install the GitHub app
          </a>
          .
        </p>
        <Dropdown
          overlay={!breakpoints.md()}
          opened={installationDropdownOpened()}
          setOpened={setInstallationDropdownOpened}
          activatorWrapperClass="w-full"
          class="w-full"
          activatorButton={() => {
            const account = (): Installation["account"] => {
              const installation = installations().find(({ id }) => id === installationId());

              return installation?.account || null;
            };

            return (
              <Button text="soft" class="flex m-0 px-1 w-full justify-center items-center">
                <Show
                  when={account()}
                  keyed
                  fallback={
                    <>
                      <span class="px-1 flex-1 text-start">Select Account</span>
                      <Icon path={mdiChevronDown} class="h-6 w-6 mr-2" />
                    </>
                  }
                >
                  {(account) => {
                    return (
                      <>
                        <img src={account?.avatar_url} class="h-6 w-6 mr-1" />
                        <span class="flex-1 text-start">
                          {account && "login" in account! ? account!.login : account?.name || ""}
                        </span>
                        <Icon path={mdiChevronDown} class="h-6 w-6 mr-2" />
                      </>
                    );
                  }}
                </Show>
              </Button>
            );
          }}
        >
          <div class="flex flex-col gap-1 overflow-visible min-w-48">
            <For each={installations()}>
              {(installation) => {
                const { account, id } = installation;

                return (
                  <Button
                    class="flex m-0 px-1"
                    color={installationId() === id ? "primary" : "contrast"}
                    text={installationId() === id ? "primary" : "soft"}
                    variant={installationId() === id ? "solid" : "text"}
                    onClick={() => {
                      setInstallationId(id);
                      setInstallationDropdownOpened(false);
                    }}
                  >
                    <img src={account?.avatar_url} class="h-6 w-6 mr-1 bg-gray-100 rounded-full" />
                    {account && "login" in account ? account.login : account?.name || ""}
                  </Button>
                );
              }}
            </For>
          </div>
        </Dropdown>
      </Show>
      <Show when={installationId()}>
        <Heading level={3}>Repository</Heading>
        <p class="prose text-gray-500 dark:text-gray-400 w-full">
          Select the GitHub repository to sync this space with. This repository should be authorized
          in the GitHub installation.
        </p>
        <Dropdown
          overlay={!breakpoints.md()}
          opened={repositoryDropdownOpened()}
          setOpened={setRepositoryDropdownOpened}
          activatorWrapperClass="w-full"
          class="w-full"
          activatorButton={() => {
            const repository = (): Repository | null => {
              return (
                repositories().find((repository) => repository.id === selectedRepo()?.id) || null
              );
            };

            return (
              <Button text="soft" class="flex m-0 w-full">
                <Show when={repository()} keyed fallback="Select Repository">
                  {(repository) => repository.name || ""}
                </Show>
              </Button>
            );
          }}
        >
          <div class="flex flex-col gap-1 overflow-visible min-w-48">
            <For each={repositories()}>
              {(repository) => {
                const { id, name, owner } = repository;

                return (
                  <Button
                    class="flex m-0"
                    color={selectedRepo()?.id === id ? "primary" : "contrast"}
                    text={selectedRepo()?.id === id ? "primary" : "soft"}
                    variant={selectedRepo()?.id === id ? "solid" : "text"}
                    onClick={() => {
                      setSelectedRepo({ id, name, owner: owner.login || "" });
                      setRepositoryDropdownOpened(false);
                    }}
                  >
                    {name}
                  </Button>
                );
              }}
            </For>
          </div>
        </Dropdown>
      </Show>
      <Show when={selectedRepo()}>
        <Heading level={3}>Branch</Heading>
        <p class="prose text-gray-500 dark:text-gray-400 w-full">
          Select a Git branch to sync your content with.
        </p>
        <Dropdown
          overlay={!breakpoints.md()}
          opened={branchDropdownOpened()}
          setOpened={setBranchDropdownOpened}
          activatorWrapperClass="w-full"
          class="w-full"
          activatorButton={() => {
            const branch = (): Branch | null => {
              return branches().find((branch) => branch.name === branchName()) || null;
            };

            return (
              <Button text="soft" class="flex m-0 w-full">
                <Show when={branch()} keyed fallback="Select Branch">
                  {(branch) => branch.name || ""}
                </Show>
              </Button>
            );
          }}
        >
          <div class="flex flex-col gap-1 overflow-visible min-w-48">
            <For each={branches()}>
              {(branch) => {
                const { name } = branch;

                return (
                  <Button
                    class="flex m-0"
                    color={branchName() === name ? "primary" : "contrast"}
                    text={branchName() === name ? "primary" : "soft"}
                    variant={branchName() === name ? "solid" : "text"}
                    onClick={() => {
                      setBranchName(name);
                      setBranchDropdownOpened(false);
                    }}
                  >
                    {name}
                  </Button>
                );
              }}
            </For>
          </div>
        </Dropdown>
      </Show>
    </div>
  );
};

export { GitHubConfigurationView };
