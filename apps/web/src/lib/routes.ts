import AuthLayout from "../pages/auth/layout";
import EmailPage from "../pages/auth/email/page";
import SignInPage from "../pages/auth/sign-in/page";
import SignUpPage from "../pages/auth/sign-up/page";
import InvitePage from "../pages/invite/page";
import NewWorkspacePage from "../pages/new-workspace/page";
import WorkspaceLayout from "../pages/workspace/layout";
import HomePage from "../pages/workspace/entry/page";
import SettingsLayout from "../pages/workspace/settings/layout";
import PersonalSettingsPage from "../pages/workspace/settings/personal/page";
import WorkspaceSettingsPage from "../pages/workspace/settings/workspace/page";
import PeopleSettingsPage from "../pages/workspace/settings/people/page";
import InviteSettingsPage from "../pages/workspace/settings/invite/page";
import RoleSettingsPage from "../pages/workspace/settings/role/page";
import BillingSettingsPage from "../pages/workspace/settings/billing/page";
import APISettingsPage from "../pages/workspace/settings/api/page";
import KeySettingsPage from "../pages/workspace/settings/key/page";
import { Params, redirect, RouteDefinition, useCurrentMatches, useParams } from "@solidjs/router";
import { Accessor, createMemo } from "solid-js";

interface RouteData {
  title: string;
  breadcrumbs: Array<{
    label: string;
    path?: string;
  }>;
}

const routesData: Record<string, (params: Params) => RouteData> = {
  "/:workspaceID/settings/personal": () => ({
    title: "Personal",
    breadcrumbs: [{ label: "Settings" }, { label: "Personal", path: "/settings/personal" }]
  }),
  "/:workspaceID/settings/workspace": () => ({
    title: "General",
    breadcrumbs: [{ label: "Settings" }, { label: "General", path: "/settings/workspace" }]
  }),
  "/:workspaceID/settings/people": () => ({
    title: "People",
    breadcrumbs: [{ label: "Settings" }, { label: "People", path: "/settings/people" }]
  }),
  "/:workspaceID/settings/invite": () => ({
    title: "Invite member",
    breadcrumbs: [
      { label: "Settings" },
      { label: "People", path: "/settings/people" },
      { label: "Invite", path: "/settings/invite" }
    ]
  }),
  "/:workspaceID/settings/role/:roleID?": (params) => ({
    title: params.roleID ? "Edit role" : "Create role",
    breadcrumbs: [
      { label: "Settings" },
      { label: "People", path: "/settings/people" },
      {
        label: params.roleID ? "Edit role" : "Create role",
        path: `/settings/role/${params.roleID || ""}`
      }
    ]
  }),
  "/:workspaceID/settings/billing": () => ({
    title: "Billing",
    breadcrumbs: [{ label: "Settings" }, { label: "Billing", path: "/settings/billing" }]
  }),
  "/:workspaceID/settings/api": () => ({
    title: "API",
    breadcrumbs: [{ label: "Settings" }, { label: "API", path: "/settings/api" }]
  }),
  "/:workspaceID/settings/key/:keyID?": (params) => ({
    title: params.keyID ? "Edit API key" : "Create API key",
    breadcrumbs: [
      { label: "Settings" },
      { label: "API", path: "/settings/api" },
      {
        label: params.keyID ? "Edit API key" : "Create API key",
        path: `/settings/key/${params.keyID || ""}`
      }
    ]
  })
};
const routes: RouteDefinition[] = [
  {
    path: "/auth",
    component: AuthLayout,
    children: [
      { path: "/sign-in", component: SignInPage },
      { path: "/sign-up", component: SignUpPage },
      { path: "/email", component: EmailPage }
    ]
  },
  { path: "/invite", component: InvitePage },
  { path: "/new-workspace", component: NewWorkspacePage },
  {
    path: "/:workspaceID",
    component: WorkspaceLayout,
    children: [
      {
        path: "/settings",
        component: SettingsLayout,
        children: [
          {
            path: "/",
            preload: ({ params }) => {
              throw redirect(`/${params.workspaceID}/settings/personal`);
            }
          },
          {
            path: "/personal",
            component: PersonalSettingsPage
          },
          {
            path: "/workspace",
            component: WorkspaceSettingsPage
          },
          {
            path: "/people",
            component: PeopleSettingsPage
          },
          {
            path: "/invite",
            component: InviteSettingsPage
          },
          {
            path: "/role/:roleID?",
            component: RoleSettingsPage
          },
          {
            path: "/billing",
            component: BillingSettingsPage
          },
          {
            path: "/api",
            component: APISettingsPage
          },
          {
            path: "/key/:keyID?",
            component: KeySettingsPage
          }
        ]
      },
      { path: "/", component: HomePage },
      { path: "/*slug", component: HomePage }
    ]
  }
];

const useRouteData = (): Accessor<RouteData | null> => {
  const params = useParams();
  const currentMatches = useCurrentMatches();
  const routeData = createMemo(() => {
    const matches = currentMatches();

    for (const match of matches) {
      const routeData = routesData[match.route.pattern];

      if (routeData) {
        return routeData(params);
      }
    }

    return null;
  });

  return routeData;
};

export { routes, useRouteData };
