"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // ../../node_modules/.pnpm/unfetch@4.2.0/node_modules/unfetch/dist/unfetch.js
  var require_unfetch = __commonJS({
    "../../node_modules/.pnpm/unfetch@4.2.0/node_modules/unfetch/dist/unfetch.js"(exports, module) {
      module.exports = function(e, n) {
        return n = n || {}, new Promise(function(t, r) {
          var s2 = new XMLHttpRequest(), o2 = [], u = [], i = {}, a = function() {
            return { ok: 2 == (s2.status / 100 | 0), statusText: s2.statusText, status: s2.status, url: s2.responseURL, text: function() {
              return Promise.resolve(s2.responseText);
            }, json: function() {
              return Promise.resolve(s2.responseText).then(JSON.parse);
            }, blob: function() {
              return Promise.resolve(new Blob([s2.response]));
            }, clone: a, headers: { keys: function() {
              return o2;
            }, entries: function() {
              return u;
            }, get: function(e2) {
              return i[e2.toLowerCase()];
            }, has: function(e2) {
              return e2.toLowerCase() in i;
            } } };
          };
          for (var l in s2.open(n.method || "get", e, true), s2.onload = function() {
            s2.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm, function(e2, n2, t2) {
              o2.push(n2 = n2.toLowerCase()), u.push([n2, t2]), i[n2] = i[n2] ? i[n2] + "," + t2 : t2;
            }), t(a());
          }, s2.onerror = r, s2.withCredentials = "include" == n.credentials, n.headers)
            s2.setRequestHeader(l, n.headers[l]);
          s2.send(n.body || null);
        });
      };
    }
  });

  // ../../node_modules/.pnpm/isomorphic-unfetch@3.1.0/node_modules/isomorphic-unfetch/browser.js
  var require_browser = __commonJS({
    "../../node_modules/.pnpm/isomorphic-unfetch@3.1.0/node_modules/isomorphic-unfetch/browser.js"(exports, module) {
      module.exports = self.fetch || (self.fetch = require_unfetch().default || require_unfetch());
    }
  });

  // ../../packages/sdk/javascript/dist/api.mjs
  var api_exports = {};
  __export(api_exports, {
    createClient: () => W
  });
  var import_isomorphic_unfetch, b, P, s, y, k, T, G, o, g, w, U, c, S, L, x, p, D, m, O, j, I, f, W;
  var init_api = __esm({
    "../../packages/sdk/javascript/dist/api.mjs"() {
      import_isomorphic_unfetch = __toESM(require_browser(), 1);
      b = "/content-groups";
      P = (t) => ({ list: () => t("GET", `${b}/list`), create: (r) => t("POST", `${b}`, { body: r }), update: (r) => t("PUT", `${b}`, { body: r }), delete: (r) => t("DELETE", `${b}`, { params: r }) });
      s = "/content-pieces";
      y = (t) => ({ get: (r) => t("GET", `${s}`, { params: r }), create: (r) => t("POST", `${s}`, { body: r }), update: (r) => t("PUT", `${s}`, { body: r }), delete: (r) => t("DELETE", `${s}`, { params: r }), list: (r) => t("GET", `${s}/list`, { params: r }) });
      k = (t) => {
        let r = t.baseURL || "https://api.vrite.io", e = t.extensionId || "", l = t.headers || {}, { token: u } = t;
        return { sendRequest: async (a, h, i) => {
          try {
            const n = await fetch(`${r}${h}/?${encodeURI(Object.entries(i?.params || {}).filter(([, $]) => $).map(([$, d]) => `${$}=${d}`).join("&"))}`, { headers: { Authorization: `Bearer ${u}`, Accept: "application/json", ...i?.body ? { "Content-Type": "application/json" } : {}, ...e ? { "X-Vrite-Extension-ID": e } : {}, ...l }, body: i?.body ? JSON.stringify(i.body) : null, method: a });
            let E = null;
            try {
              if (E = await n.json(), !E)
                return;
            } catch {
              return;
            }
            if (!n.ok)
              throw E;
            return E;
          } catch (n) {
            throw console.error(n), n;
          }
        }, reconfigure: (a) => {
          r = a.baseURL || r, u = a.token || u, e = a.extensionId || e, l = a.headers || l;
        } };
      };
      T = "/user-settings";
      G = (t) => ({ get: () => t("GET", `${T}`), update: (r) => t("PUT", `${T}`, { body: r }) });
      o = "/tags";
      g = (t) => ({ get: (r) => t("GET", `${o}`, { params: r }), update: (r) => t("PUT", `${o}`, { body: r }), create: (r) => t("PUT", `${o}`, { body: r }), delete: (r) => t("DELETE", `${o}`, { params: r }), list: (r) => t("GET", `${o}/list`, { params: r }) });
      w = "/profile";
      U = (t) => ({ get: () => t("GET", `${w}`) });
      c = "/webhooks";
      S = (t) => ({ get: (r) => t("GET", `${c}`, { params: r }), create: (r) => t("POST", `${c}`, { body: r }), update: (r) => t("PUT", `${c}`, { body: r }), delete: (r) => t("DELETE", `${c}`, { params: r }), list: (r) => t("GET", `${c}/list`, { params: r }) });
      L = "/workspace";
      x = (t) => ({ get: () => t("GET", `${L}`) });
      p = "/roles";
      D = (t) => ({ get: (r) => t("GET", `${p}`, { params: r }), create: (r) => t("POST", `${p}`, { body: r }), update: (r) => t("PUT", `${p}`, { body: r }), delete: (r) => t("DELETE", `${p}`, { params: r }), list: (r) => t("GET", `${p}/list`, { params: r }) });
      m = "/workspace-settings";
      O = (t) => ({ get: () => t("GET", `${m}`), update: (r) => t("PUT", `${m}`, { body: r }) });
      j = (t) => ({ listMembers: (r) => t("GET", "/workspace-memberships/list-members", { params: r }), listWorkspaces: (r) => t("GET", "/workspace-memberships/list-workspaces", { params: r }), create: (r) => t("POST", "/workspace-memberships", { body: r }), update: (r) => t("PUT", "/workspace-memberships", { body: r }), delete: (r) => t("DELETE", "/workspace-memberships", { params: r }) });
      I = "/extension";
      f = (t) => ({ get: () => t("GET", `${I}`) });
      W = (t) => {
        const { sendRequest: r, reconfigure: e } = k(t);
        return { contentGroups: P(r), contentPieces: y(r), tags: g(r), profile: U(r), userSettings: G(r), webhooks: S(r), workspace: x(r), roles: D(r), workspaceSettings: O(r), workspaceMemberships: j(r), extension: f(r), reconfigure: e };
      };
    }
  });

  // scripts/sandbox.ts
  (async () => {
    const { createClient } = await Promise.resolve().then(() => (init_api(), api_exports));
    const client = createClient({
      token: "",
      extensionId: ""
    });
    const context = {};
    const createSetterMethod = (contextKey) => {
      return (keyOrPartial, value) => {
        context[contextKey] = context[contextKey] || {};
        if (typeof keyOrPartial === "string" && typeof value !== "undefined") {
          context[contextKey][keyOrPartial] = value;
          if (keyOrPartial.startsWith("$")) {
            Websandbox.connection?.remote.forceUpdate(JSON.parse(JSON.stringify(context)));
          }
        } else {
          Object.assign(context[contextKey], keyOrPartial);
          const dynamic = Object.keys(keyOrPartial).some((key) => key.startsWith("$"));
          if (dynamic) {
            Websandbox.connection?.remote.forceUpdate(JSON.parse(JSON.stringify(context)));
          }
        }
      };
    };
    const contextMethods = {
      setConfig: createSetterMethod("config"),
      setTemp: createSetterMethod("temp"),
      setData: createSetterMethod("data")
    };
    const buildContext = ({ methods, ...inputContext }) => {
      Object.assign(context, {
        ...inputContext,
        ...methods && Object.fromEntries(
          methods.map((method) => [
            method,
            contextMethods[method]
          ])
        )
      });
    };
    Websandbox.connection?.setLocalApi({
      reload: () => {
        window.location.reload();
      },
      callFunction: async (func, inputContext, meta) => {
        client.reconfigure({
          token: meta.token,
          extensionId: meta.extensionId
        });
        buildContext(inputContext);
        const url = URL.createObjectURL(new Blob([func], { type: "text/javascript" }));
        const module = await import(
          /* @vite-ignore */
          `${url}`
        );
        URL.revokeObjectURL(url);
        await module.default(
          new Proxy(
            {
              ...context,
              client,
              token: meta.token,
              extensionId: meta.extensionId,
              notify: Websandbox.connection?.remote.notify
            },
            {
              get(target, prop) {
                if (prop in target && typeof target[prop] !== "undefined") {
                  return target[prop];
                }
                return (...args) => {
                  return Websandbox.connection?.remote.remoteFunction(prop, ...args);
                };
              }
            }
          )
        );
        return JSON.parse(JSON.stringify(context));
      }
    });
    Websandbox.connection?.remote.hasLoaded();
  })();
})();
