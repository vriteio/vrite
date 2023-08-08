import { SearchableSelect } from "./searchable-select";
import {
  mdiFileTree,
  mdiGithub,
  mdiRefresh,
  mdiSourceBranch,
  mdiSwapHorizontalCircleOutline
} from "@mdi/js";
import { Component, Match, Show, Switch, createMemo, createResource, createSignal } from "solid-js";
import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { Button, Heading, IconButton, Input, Tooltip } from "#components/primitives";
import { App, useClient } from "#context";
import { InputField, TitledCard } from "#components/fragments";

interface GitHubConfigurationViewProps {
  gitData: App.GitData | null;
  setActionComponent(component: Component<{}> | null): void;
  setOpenedProvider(provider: string): void;
}

type Installation =
  RestEndpointMethodTypes["apps"]["listInstallationsForAuthenticatedUser"]["response"]["data"]["installations"][0];
type Repository =
  RestEndpointMethodTypes["apps"]["listInstallationReposForAuthenticatedUser"]["response"]["data"]["repositories"][0];
type Branch = RestEndpointMethodTypes["repos"]["listBranches"]["response"]["data"][0];

const GitHubConfigurationView: Component<GitHubConfigurationViewProps> = (props) => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [selectedInstallation, setSelectedInstallation] = createSignal<Installation | null>(null);
  const [selectedRepository, setSelectedRepository] = createSignal<Repository | null>(null);
  const [selectedBranch, setSelectedBranch] = createSignal<Branch | null>(null);
  const [baseDirectory, setBaseDirectory] = createSignal("/");
  const [matchPattern, setMatchPattern] = createSignal("**/*.md");
  const [inputTransformer, setInputTransformer] = createSignal("markdown");
  const [outputTransformer, setOutputTransformer] = createSignal("markdown");
  const [formatOutput, setFormatOutput] = createSignal(true);
  const [token, setToken] = createSignal("");
  const savedGitHubConfig = (): App.GitHubData | null => props.gitData?.github || null;
  const octokit = createMemo(() => {
    return new Octokit({ auth: token() });
  });
  const filled = createMemo(() => {
    return Boolean(
      selectedInstallation() &&
        selectedRepository() &&
        selectedBranch() &&
        baseDirectory() &&
        inputTransformer() &&
        outputTransformer()
    );
  });
  const [installations, { refetch: refetchInstallations }] = createResource(
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
  const [repositories, { refetch: refetchRepositories }] = createResource(
    selectedInstallation,
    async (installation) => {
      if (!token() || !installation) return [];

      const response = await octokit().apps.listInstallationReposForAuthenticatedUser({
        // eslint-disable-next-line camelcase
        installation_id: installation.id,
        // eslint-disable-next-line camelcase
        per_page: 100
      });

      return response.data.repositories;
    },
    { initialValue: [] }
  );
  const [branches, { refetch: refetchBranches }] = createResource(
    selectedRepository,
    async (repository) => {
      if (!token() || !repository) return [];

      const response = await octokit().repos.listBranches({
        owner: repository.owner.login,
        repo: repository.name
      });

      return response.data;
    },
    { initialValue: [] }
  );
  const retrievedToken = new URL(location.href).searchParams.get("token");

  if (retrievedToken) {
    const path =
      location.pathname + location.search.replace(/\b(token)=\w+/g, "").replace(/[?&]+$/, "");

    history.replaceState({}, "", path);
    setToken(retrievedToken);
  }

  props.setActionComponent(() => {
    return (
      <Switch>
        <Match when={!savedGitHubConfig()}>
          <Button
            class="m-0"
            color="primary"
            disabled={!filled()}
            loading={loading()}
            onClick={async () => {
              setLoading(true);
              await client.git.github.configure.mutate({
                installationId: selectedInstallation()!.id,
                repositoryName: selectedRepository()!.name,
                repositoryOwner: selectedRepository()!.owner.login,
                branchName: selectedBranch()!.name,
                baseDirectory: baseDirectory(),
                matchPattern: matchPattern(),
                inputTransformer: inputTransformer(),
                outputTransformer: outputTransformer(),
                formatOutput: formatOutput()
              });
              setLoading(false);
              props.setOpenedProvider("");
            }}
          >
            Save
          </Button>
        </Match>
        <Match when={savedGitHubConfig()}>
          <Button
            class="m-0"
            color="primary"
            onClick={() => {
              client.git.reset.mutate();
            }}
          >
            Reset
          </Button>
        </Match>
      </Switch>
    );
  });

  return (
    <>
      <TitledCard
        icon={mdiSourceBranch}
        label="Repository"
        action={
          <Show when={!savedGitHubConfig()}>
            <Tooltip text="Refresh" side="left" class="-ml-1">
              <IconButton
                path={mdiRefresh}
                loading={installations.loading || repositories.loading || branches.loading}
                text="soft"
                class="m-0"
                onClick={async () => {
                  setSelectedInstallation(null);
                  setSelectedRepository(null);
                  setSelectedBranch(null);
                  await refetchInstallations();
                  await refetchRepositories();
                  await refetchBranches();
                }}
              />
            </Tooltip>
          </Show>
        }
      >
        <div class="flex flex-col items-start w-full gap-2">
          <Show
            when={token() || savedGitHubConfig()}
            fallback={
              <>
                <p class="prose text-gray-500 dark:text-gray-400 w-full">
                  Authenticate with your GitHub account
                </p>
                <IconButton
                  path={mdiGithub}
                  class="m-0"
                  label="Continue with GitHub"
                  color="contrast"
                  onClick={() => {
                    window.location.replace("github/login");
                  }}
                />
              </>
            }
          >
            <p class="prose text-gray-500 dark:text-gray-400 w-full">
              <a href="https://github.com/apps/vrite-io/installations/select_target">
                Install the GitHub app
              </a>{" "}
              to provide access to the repository. Then, select it and one of its branches to sync
              with.
            </p>
            <Heading level={3}>Account</Heading>
            <p class="prose text-gray-500 dark:text-gray-400 w-full">
              Select user or organization from ones with installed GitHub app.
            </p>
            <Show
              when={!savedGitHubConfig()}
              fallback={
                <Input
                  value={savedGitHubConfig()?.repositoryOwner || ""}
                  class="w-full m-0"
                  wrapperClass="w-full"
                  color="contrast"
                  disabled
                />
              }
            >
              <SearchableSelect
                options={installations()}
                selected={selectedInstallation()}
                extractId={(installation) => installation.id.toString()}
                renderOption={({ account }) => {
                  const hasLogin = account && "login" in account;

                  return (
                    <div class="flex w-full">
                      <img src={account?.avatar_url} class="h-6 w-6 mr-1" />
                      <span class="flex-1 text-start">
                        {hasLogin ? account.login : account?.name || ""}
                      </span>
                    </div>
                  );
                }}
                filterOption={({ account }, query) => {
                  const hasLogin = account && "login" in account;
                  const name = hasLogin ? account.login : account?.name || "";

                  return name.toLowerCase().includes(query.toLowerCase());
                }}
                selectOption={(option) => {
                  setSelectedInstallation(option);
                }}
                loading={installations.loading}
                placeholder="Select account"
              />
            </Show>
          </Show>
          <Show when={selectedInstallation() || savedGitHubConfig()}>
            <Heading level={3}>Repository</Heading>
            <p class="prose text-gray-500 dark:text-gray-400 w-full">
              Select the GitHub repository to sync this space with. This repository should be
              authorized in the GitHub installation.
            </p>
            <Show
              when={!savedGitHubConfig()}
              fallback={
                <Input
                  value={savedGitHubConfig()?.repositoryName || ""}
                  class="w-full m-0"
                  wrapperClass="w-full"
                  color="contrast"
                  disabled
                />
              }
            >
              <SearchableSelect
                options={repositories()}
                selected={selectedRepository()}
                extractId={(repository) => repository.id.toString()}
                renderOption={({ name }) => (
                  <div class="text-start w-full clamp-1 px-1">{name}</div>
                )}
                filterOption={({ name }, query) => {
                  return name.toLowerCase().includes(query.toLowerCase());
                }}
                selectOption={(option) => {
                  setSelectedRepository(option);
                }}
                loading={repositories.loading}
                placeholder="Select repository"
              />
            </Show>
          </Show>
          <Show when={selectedRepository() || savedGitHubConfig()}>
            <Heading level={3}>Branch</Heading>
            <p class="prose text-gray-500 dark:text-gray-400 w-full">
              Select a Git branch to sync your content with.
            </p>
            <Show
              when={!savedGitHubConfig()}
              fallback={
                <Input
                  value={savedGitHubConfig()?.branchName || ""}
                  class="w-full m-0"
                  wrapperClass="w-full"
                  color="contrast"
                  disabled
                />
              }
            >
              <SearchableSelect
                options={branches()}
                selected={selectedBranch()}
                extractId={(branch) => branch.name}
                renderOption={({ name }) => (
                  <div class="text-start w-full clamp-1 px-1">{name}</div>
                )}
                filterOption={({ name }, query) => {
                  return name.toLowerCase().includes(query.toLowerCase());
                }}
                selectOption={(option) => {
                  setSelectedBranch(option);
                }}
                loading={branches.loading}
                placeholder="Select branch"
              />
            </Show>
          </Show>
        </div>
      </TitledCard>
      <TitledCard icon={mdiFileTree} label="Mapping">
        <div class="flex flex-col items-start w-full gap-2">
          <p class="prose text-gray-500 dark:text-gray-400 w-full">
            Map your content to the GitHub repository.
          </p>
          <InputField
            label="Base directory"
            color="contrast"
            type="text"
            value={savedGitHubConfig()?.baseDirectory || baseDirectory()}
            disabled={Boolean(savedGitHubConfig())}
            setValue={setBaseDirectory}
            placeholder="/docs"
          >
            Path to the base directory of which files will be synced.
          </InputField>
          <InputField
            label="Match pattern"
            color="contrast"
            type="text"
            value={savedGitHubConfig()?.matchPattern || matchPattern()}
            disabled={Boolean(savedGitHubConfig())}
            setValue={setMatchPattern}
            placeholder="**/*.md"
          >
            Provide a glob match pattern for the files to sync. (relative to the base directory)
          </InputField>
        </div>
      </TitledCard>
      <TitledCard icon={mdiSwapHorizontalCircleOutline} label="Transformers">
        <div class="flex flex-col items-start w-full gap-2">
          <p class="prose text-gray-500 dark:text-gray-400 w-full">
            Select the transformers to use for your content.
          </p>
          <InputField
            label="Input transformer"
            color="contrast"
            type="select"
            value={savedGitHubConfig()?.inputTransformer || inputTransformer()}
            disabled={Boolean(savedGitHubConfig())}
            setValue={setInputTransformer}
            options={[{ label: "Markdown", value: "markdown" }]}
            placeholder="Select input transformer"
          >
            Transformer to use for parsing the input files.
          </InputField>
          <InputField
            label="Output transformer"
            color="contrast"
            type="select"
            value={savedGitHubConfig()?.outputTransformer || outputTransformer()}
            disabled={Boolean(savedGitHubConfig())}
            setValue={setOutputTransformer}
            options={[{ label: "Markdown", value: "markdown" }]}
            placeholder="Select output transformer"
          >
            Transformer to use for generating the output files.
          </InputField>
          <InputField
            label="Format output"
            type="checkbox"
            value={formatOutput()}
            setValue={setFormatOutput}
          >
            Format the output files with Prettier.
          </InputField>
        </div>
      </TitledCard>
    </>
  );
};

export { GitHubConfigurationView };
