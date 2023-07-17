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
          for (var l2 in s2.open(n.method || "get", e, true), s2.onload = function() {
            s2.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm, function(e2, n2, t2) {
              o2.push(n2 = n2.toLowerCase()), u.push([n2, t2]), i[n2] = i[n2] ? i[n2] + "," + t2 : t2;
            }), t(a());
          }, s2.onerror = r, s2.withCredentials = "include" == n.credentials, n.headers)
            s2.setRequestHeader(l2, n.headers[l2]);
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
    createClient: () => v
  });
  var import_isomorphic_unfetch, b, k, o, G, g, m, w, s, U, S, L, c, D, O, x, p, j, d, I, f, h, C, l, W, v;
  var init_api = __esm({
    "../../packages/sdk/javascript/dist/api.mjs"() {
      import_isomorphic_unfetch = __toESM(require_browser(), 1);
      b = "/content-groups";
      k = (r) => ({ list: () => r("GET", `${b}/list`), create: (t) => r("POST", `${b}`, { body: t }), update: (t) => r("PUT", `${b}`, { body: t }), delete: (t) => r("DELETE", `${b}`, { params: t }) });
      o = "/content-pieces";
      G = (r) => ({ get: (t) => r("GET", `${o}`, { params: t }), create: (t) => r("POST", `${o}`, { body: t }), update: (t) => r("PUT", `${o}`, { body: t }), delete: (t) => r("DELETE", `${o}`, { params: t }), list: (t) => r("GET", `${o}/list`, { params: t }) });
      g = (r) => {
        let t = r.baseURL || "https://api.vrite.io", e = r.extensionId || "", u = r.headers || {}, { token: T } = r;
        return { sendRequest: async (a, P, i) => {
          try {
            const n = await fetch(`${t}${P}/?${encodeURI(Object.entries(i?.params || {}).filter(([, $]) => $).map(([$, y]) => `${$}=${y}`).join("&"))}`, { headers: { Authorization: `Bearer ${T}`, Accept: "application/json", ...i?.body ? { "Content-Type": "application/json" } : {}, ...e ? { "X-Vrite-Extension-ID": e } : {}, ...u }, body: i?.body ? JSON.stringify(i.body) : null, method: a });
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
          t = a.baseURL || t, T = a.token || T, e = a.extensionId || e, u = a.headers || u;
        } };
      };
      m = "/user-settings";
      w = (r) => ({ get: () => r("GET", `${m}`), update: (t) => r("PUT", `${m}`, { body: t }) });
      s = "/tags";
      U = (r) => ({ get: (t) => r("GET", `${s}`, { params: t }), update: (t) => r("PUT", `${s}`, { body: t }), create: (t) => r("PUT", `${s}`, { body: t }), delete: (t) => r("DELETE", `${s}`, { params: t }), list: (t) => r("GET", `${s}/list`, { params: t }) });
      S = "/profile";
      L = (r) => ({ get: () => r("GET", `${S}`) });
      c = "/webhooks";
      D = (r) => ({ get: (t) => r("GET", `${c}`, { params: t }), create: (t) => r("POST", `${c}`, { body: t }), update: (t) => r("PUT", `${c}`, { body: t }), delete: (t) => r("DELETE", `${c}`, { params: t }), list: (t) => r("GET", `${c}/list`, { params: t }) });
      O = "/workspace";
      x = (r) => ({ get: () => r("GET", `${O}`) });
      p = "/roles";
      j = (r) => ({ get: (t) => r("GET", `${p}`, { params: t }), create: (t) => r("POST", `${p}`, { body: t }), update: (t) => r("PUT", `${p}`, { body: t }), delete: (t) => r("DELETE", `${p}`, { params: t }), list: (t) => r("GET", `${p}/list`, { params: t }) });
      d = "/workspace-settings";
      I = (r) => ({ get: () => r("GET", `${d}`), update: (t) => r("PUT", `${d}`, { body: t }) });
      f = (r) => ({ listMembers: (t) => r("GET", "/workspace-memberships/list-members", { params: t }), listWorkspaces: (t) => r("GET", "/workspace-memberships/list-workspaces", { params: t }), create: (t) => r("POST", "/workspace-memberships", { body: t }), update: (t) => r("PUT", "/workspace-memberships", { body: t }), delete: (t) => r("DELETE", "/workspace-memberships", { params: t }) });
      h = "/extension";
      C = (r) => ({ get: () => r("GET", `${h}`), updateContentPieceData: (t) => r("POST", `${h}/content-piece-data`, { body: t }) });
      l = "/variants";
      W = (r) => ({ create: (t) => r("POST", `${l}`, { body: t }), update: (t) => r("PUT", `${l}`, { body: t }), delete: (t) => r("DELETE", `${l}`, { params: t }), list: () => r("GET", `${l}/list`) });
      v = (r) => {
        const { sendRequest: t, reconfigure: e } = g(r);
        return { contentGroups: k(t), contentPieces: G(t), tags: U(t), profile: L(t), userSettings: w(t), webhooks: D(t), workspace: x(t), roles: j(t), workspaceSettings: I(t), workspaceMemberships: f(t), extension: C(t), variants: W(t), reconfigure: e };
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
