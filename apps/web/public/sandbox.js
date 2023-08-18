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
      module.exports = function(e, n2) {
        return n2 = n2 || {}, new Promise(function(t, r2) {
          var s = new XMLHttpRequest(), o2 = [], u2 = [], i = {}, a = function() {
            return { ok: 2 == (s.status / 100 | 0), statusText: s.statusText, status: s.status, url: s.responseURL, text: function() {
              return Promise.resolve(s.responseText);
            }, json: function() {
              return Promise.resolve(s.responseText).then(JSON.parse);
            }, blob: function() {
              return Promise.resolve(new Blob([s.response]));
            }, clone: a, headers: { keys: function() {
              return o2;
            }, entries: function() {
              return u2;
            }, get: function(e2) {
              return i[e2.toLowerCase()];
            }, has: function(e2) {
              return e2.toLowerCase() in i;
            } } };
          };
          for (var l in s.open(n2.method || "get", e, true), s.onload = function() {
            s.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm, function(e2, n3, t2) {
              o2.push(n3 = n3.toLowerCase()), u2.push([n3, t2]), i[n3] = i[n3] ? i[n3] + "," + t2 : t2;
            }), t(a());
          }, s.onerror = r2, s.withCredentials = "include" == n2.credentials, n2.headers)
            s.setRequestHeader(l, n2.headers[l]);
          s.send(n2.body || null);
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
    createClient: () => q
  });
  var o, h, r, w, k, u, U, p, f, S, D, n, L, O, x, c, j, y, R, C, g, I, T, v, q;
  var init_api = __esm({
    "../../packages/sdk/javascript/dist/api.mjs"() {
      o = "/content-groups";
      h = (t) => ({ get: (e) => t("GET", `${o}`, { params: e }), list: (e) => t("GET", `${o}/list`, { params: e }), create: (e) => t("POST", `${o}`, { body: e }), update: (e) => t("PUT", `${o}`, { body: e }), delete: (e) => t("DELETE", `${o}`, { params: e }) });
      r = "/content-pieces";
      w = (t) => ({ get: (e) => t("GET", `${r}`, { params: e }), create: (e) => t("POST", `${r}`, { body: e }), update: (e) => t("PUT", `${r}`, { body: e }), delete: (e) => t("DELETE", `${r}`, { params: e }), list: (e) => t("GET", `${r}/list`, { params: e }) });
      k = (t) => {
        let e = t.baseURL || "https://api.vrite.io", s = t.extensionId || "", E = t.headers || {}, { token: l } = t;
        return { sendRequest: async (a, G, $) => {
          try {
            const { default: i } = await Promise.resolve().then(() => __toESM(require_browser(), 1)), b = await i(`${e}${G}/?${encodeURI(Object.entries($?.params || {}).filter(([, m]) => m).map(([m, P]) => `${m}=${P}`).join("&"))}`, { headers: { Authorization: `Bearer ${l}`, Accept: "application/json", ...$?.body ? { "Content-Type": "application/json" } : {}, ...s ? { "X-Vrite-Extension-ID": s } : {}, ...E }, body: $?.body ? JSON.stringify($.body) : null, method: a });
            let d = null;
            try {
              if (d = await b.json(), !d)
                return;
            } catch {
              return;
            }
            if (!b.ok)
              throw d;
            return d;
          } catch (i) {
            throw console.error(i), i;
          }
        }, reconfigure: (a) => {
          e = a.baseURL || e, l = a.token || l, s = a.extensionId || s, E = a.headers || E;
        } };
      };
      u = "/user-settings";
      U = (t) => ({ get: () => t("GET", `${u}`), update: (e) => t("PUT", `${u}`, { body: e }) });
      p = "/tags";
      f = (t) => ({ get: (e) => t("GET", `${p}`, { params: e }), update: (e) => t("PUT", `${p}`, { body: e }), create: (e) => t("PUT", `${p}`, { body: e }), delete: (e) => t("DELETE", `${p}`, { params: e }), list: (e) => t("GET", `${p}/list`, { params: e }) });
      S = "/profile";
      D = (t) => ({ get: () => t("GET", `${S}`) });
      n = "/webhooks";
      L = (t) => ({ get: (e) => t("GET", `${n}`, { params: e }), create: (e) => t("POST", `${n}`, { body: e }), update: (e) => t("PUT", `${n}`, { body: e }), delete: (e) => t("DELETE", `${n}`, { params: e }), list: (e) => t("GET", `${n}/list`, { params: e }) });
      O = "/workspace";
      x = (t) => ({ get: () => t("GET", `${O}`) });
      c = "/roles";
      j = (t) => ({ get: (e) => t("GET", `${c}`, { params: e }), create: (e) => t("POST", `${c}`, { body: e }), update: (e) => t("PUT", `${c}`, { body: e }), delete: (e) => t("DELETE", `${c}`, { params: e }), list: (e) => t("GET", `${c}/list`, { params: e }) });
      y = "/workspace-settings";
      R = (t) => ({ get: () => t("GET", `${y}`), update: (e) => t("PUT", `${y}`, { body: e }) });
      C = (t) => ({ listMembers: (e) => t("GET", "/workspace-memberships/list-members", { params: e }), listWorkspaces: (e) => t("GET", "/workspace-memberships/list-workspaces", { params: e }), create: (e) => t("POST", "/workspace-memberships", { body: e }), update: (e) => t("PUT", "/workspace-memberships", { body: e }), delete: (e) => t("DELETE", "/workspace-memberships", { params: e }) });
      g = "/extension";
      I = (t) => ({ get: () => t("GET", `${g}`), updateContentPieceData: (e) => t("POST", `${g}/content-piece-data`, { body: e }) });
      T = "/variants";
      v = (t) => ({ create: (e) => t("POST", `${T}`, { body: e }), update: (e) => t("PUT", `${T}`, { body: e }), delete: (e) => t("DELETE", `${T}`, { params: e }), list: () => t("GET", `${T}/list`) });
      q = (t) => {
        const { sendRequest: e, reconfigure: s } = k(t);
        return { contentGroups: h(e), contentPieces: w(e), tags: f(e), profile: D(e), userSettings: U(e), webhooks: L(e), workspace: x(e), roles: j(e), workspaceSettings: R(e), workspaceMemberships: C(e), extension: I(e), variants: v(e), reconfigure: s };
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
