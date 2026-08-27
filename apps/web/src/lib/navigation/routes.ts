import {
  type Params,
  redirect,
  type RouteDefinition,
  useCurrentMatches,
  useLocation,
  useParams
} from "@solidjs/router";
import { type Accessor, createMemo, lazy } from "solid-js";

const AuthLayout = lazy(() => import("../../pages/auth/layout"));
const EmailPage = lazy(() => import("../../pages/auth/email/page"));
const SignInPage = lazy(() => import("../../pages/auth/sign-in/page"));
const SignUpPage = lazy(() => import("../../pages/auth/sign-up/page"));
const InvitePage = lazy(() => import("../../pages/invite/page"));
const NewWorkspacePage = lazy(() => import("../../pages/new-workspace/page"));
const WorkspaceLayout = lazy(() => import("../../pages/workspace/layout"));
const EntryPage = lazy(() => import("../../pages/workspace/entry/page"));
const CollectionPage = lazy(() => import("../../pages/workspace/collection/page"));
const SettingsLayout = lazy(() => import("../../pages/workspace/settings/layout"));
const PersonalSettingsPage = lazy(() => import("../../pages/workspace/settings/personal/page"));
const WorkspaceSettingsPage = lazy(() => import("../../pages/workspace/settings/workspace/page"));
const PublishingSettingsPage = lazy(() => import("../../pages/workspace/settings/publishing/page"));
const PeopleSettingsPage = lazy(() => import("../../pages/workspace/settings/people/page"));
const InviteSettingsPage = lazy(() => import("../../pages/workspace/settings/invite/page"));
const RoleSettingsPage = lazy(() => import("../../pages/workspace/settings/role/page"));
const GroupSettingsPage = lazy(() => import("../../pages/workspace/settings/group/page"));
const BillingSettingsPage = lazy(() => import("../../pages/workspace/settings/billing/page"));
const APISettingsPage = lazy(() => import("../../pages/workspace/settings/api/page"));
const KeySettingsPage = lazy(() => import("../../pages/workspace/settings/key/page"));

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
  "/:workspaceID/settings/publishing": () => ({
    title: "Publishing",
    breadcrumbs: [{ label: "Settings" }, { label: "Publishing", path: "/settings/publishing" }]
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
  "/:workspaceID/settings/group/:groupID?": (params) => ({
    title: params.groupID ? "Edit group" : "Create group",
    breadcrumbs: [
      { label: "Settings" },
      { label: "People", path: "/settings/people" },
      {
        label: params.groupID ? "Edit group" : "Create group",
        path: `/settings/group/${params.groupID || ""}`
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
            path: "/publishing",
            component: PublishingSettingsPage
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
            path: "/group/:groupID?",
            component: GroupSettingsPage
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
      { path: "/", component: EntryPage },
      {
        path: "/:slug",
        matchFilters: { slug: /^ent_/ },
        component: EntryPage
      },
      {
        path: "/:slug",
        matchFilters: { slug: /^coll_/ },
        component: CollectionPage
      }
    ]
  }
];

const useRouteData = (): Accessor<RouteData | null> => {
  const params = useParams();
  const location = useLocation();
  const currentMatches = useCurrentMatches();
  const routeData = createMemo(() => {
    const matches = currentMatches();

    for (const match of matches) {
      const routeData = routesData[match.route.pattern];

      if (routeData) {
        return routeData(params);
      }
    }

    const segments = location.pathname.split("/").filter(Boolean);
    const settingsIndex = segments.indexOf("settings");
    const settingsRoute = segments[settingsIndex + 1];
    const optionalRoutePatterns: Record<string, string> = {
      group: "/:workspaceID/settings/group/:groupID?",
      key: "/:workspaceID/settings/key/:keyID?",
      role: "/:workspaceID/settings/role/:roleID?"
    };
    const optionalRouteData = settingsRoute
      ? routesData[optionalRoutePatterns[settingsRoute]]
      : null;

    if (optionalRouteData) return optionalRouteData(params);

    return null;
  });

  return routeData;
};

export { routes, useRouteData };
