// vite.config.mts
import { defineConfig, loadEnv } from "file:///Users/areknawo/Desktop/vrite/node_modules/.pnpm/vite@5.0.12_@types+node@20.11.16_sass@1.70.0_terser@5.27.0/node_modules/vite/dist/node/index.js";
import solidPlugin from "file:///Users/areknawo/Desktop/vrite/node_modules/.pnpm/vite-plugin-solid@2.9.1_solid-js@1.8.14_vite@5.0.12/node_modules/vite-plugin-solid/dist/esm/index.mjs";
import tsconfigPaths from "file:///Users/areknawo/Desktop/vrite/node_modules/.pnpm/vite-tsconfig-paths@4.3.1_typescript@5.3.3_vite@5.0.12/node_modules/vite-tsconfig-paths/dist/index.mjs";
import unocss from "file:///Users/areknawo/Desktop/vrite/node_modules/.pnpm/unocss@0.59.0_postcss@8.4.39_vite@5.0.12/node_modules/unocss/dist/vite.mjs";
var vite_config_default = defineConfig(async ({ mode }) => {
  const plugins = [tsconfigPaths(), unocss(), solidPlugin()];
  const env = loadEnv(mode, process.cwd(), "PUBLIC_");
  const proxyTarget = env.PUBLIC_APP_URL;
  if (mode === "development") {
    plugins.push({
      name: "html-transform",
      transformIndexHtml(html) {
        return html.replace(/{{(PUBLIC_.+?)}}/g, (_match, name) => {
          return env[name];
        }).replace(/{{#if VRITE_CLOUD}}(?:.|\n)+?{{\/if}}/g, "");
      }
    });
  }
  return {
    logLevel: "info",
    envPrefix: "PUBLIC_",
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          ws: true
        },
        "/session": { target: proxyTarget, ws: true },
        "/login": { target: proxyTarget, ws: true },
        "/github": { target: proxyTarget, ws: true },
        "/upload": { target: proxyTarget, ws: true }
      }
    },
    build: {
      minify: "terser",
      target: "esnext"
    },
    plugins
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2FyZWtuYXdvL0Rlc2t0b3AvdnJpdGUvYXBwcy93ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9hcmVrbmF3by9EZXNrdG9wL3ZyaXRlL2FwcHMvd2ViL3ZpdGUuY29uZmlnLm10c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYXJla25hd28vRGVza3RvcC92cml0ZS9hcHBzL3dlYi92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgeyBQbHVnaW5PcHRpb24sIGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgc29saWRQbHVnaW4gZnJvbSBcInZpdGUtcGx1Z2luLXNvbGlkXCI7XG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiO1xuaW1wb3J0IHVub2NzcyBmcm9tIFwidW5vY3NzL3ZpdGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKGFzeW5jICh7IG1vZGUgfSkgPT4ge1xuICBjb25zdCBwbHVnaW5zOiBQbHVnaW5PcHRpb25bXSA9IFt0c2NvbmZpZ1BhdGhzKCksIHVub2NzcygpLCBzb2xpZFBsdWdpbigpXTtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCBcIlBVQkxJQ19cIik7XG4gIGNvbnN0IHByb3h5VGFyZ2V0ID0gZW52LlBVQkxJQ19BUFBfVVJMO1xuXG4gIGlmIChtb2RlID09PSBcImRldmVsb3BtZW50XCIpIHtcbiAgICAvLyBPbmx5IHRyYW5zZm9ybSBpbmRleC5odG1sIGluIGRldiBtb2RlIC0gaW4gcHJvZHVjdGlvbiBIYW5kbGViYXJzIHdpbGwgZG8gdGhpc1xuICAgIHBsdWdpbnMucHVzaCh7XG4gICAgICBuYW1lOiBcImh0bWwtdHJhbnNmb3JtXCIsXG4gICAgICB0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBodG1sXG4gICAgICAgICAgLnJlcGxhY2UoL3t7KFBVQkxJQ18uKz8pfX0vZywgKF9tYXRjaCwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGVudltuYW1lXTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5yZXBsYWNlKC97eyNpZiBWUklURV9DTE9VRH19KD86LnxcXG4pKz97e1xcL2lmfX0vZywgXCJcIik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGxvZ0xldmVsOiBcImluZm9cIixcbiAgICBlbnZQcmVmaXg6IFwiUFVCTElDX1wiLFxuICAgIHNlcnZlcjoge1xuICAgICAgcHJveHk6IHtcbiAgICAgICAgXCIvYXBpXCI6IHtcbiAgICAgICAgICB0YXJnZXQ6IHByb3h5VGFyZ2V0LFxuICAgICAgICAgIHdzOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIFwiL3Nlc3Npb25cIjogeyB0YXJnZXQ6IHByb3h5VGFyZ2V0LCB3czogdHJ1ZSB9LFxuICAgICAgICBcIi9sb2dpblwiOiB7IHRhcmdldDogcHJveHlUYXJnZXQsIHdzOiB0cnVlIH0sXG4gICAgICAgIFwiL2dpdGh1YlwiOiB7IHRhcmdldDogcHJveHlUYXJnZXQsIHdzOiB0cnVlIH0sXG4gICAgICAgIFwiL3VwbG9hZFwiOiB7IHRhcmdldDogcHJveHlUYXJnZXQsIHdzOiB0cnVlIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICBtaW5pZnk6IFwidGVyc2VyXCIsXG4gICAgICB0YXJnZXQ6IFwiZXNuZXh0XCJcbiAgICB9LFxuICAgIHBsdWdpbnNcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzUyxTQUF1QixjQUFjLGVBQWU7QUFDMVYsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxtQkFBbUI7QUFDMUIsT0FBTyxZQUFZO0FBRW5CLElBQU8sc0JBQVEsYUFBYSxPQUFPLEVBQUUsS0FBSyxNQUFNO0FBQzlDLFFBQU0sVUFBMEIsQ0FBQyxjQUFjLEdBQUcsT0FBTyxHQUFHLFlBQVksQ0FBQztBQUN6RSxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLFNBQVM7QUFDbEQsUUFBTSxjQUFjLElBQUk7QUFFeEIsTUFBSSxTQUFTLGVBQWU7QUFFMUIsWUFBUSxLQUFLO0FBQUEsTUFDWCxNQUFNO0FBQUEsTUFDTixtQkFBbUIsTUFBYztBQUMvQixlQUFPLEtBQ0osUUFBUSxxQkFBcUIsQ0FBQyxRQUFRLFNBQVM7QUFDOUMsaUJBQU8sSUFBSSxJQUFJO0FBQUEsUUFDakIsQ0FBQyxFQUNBLFFBQVEsMENBQTBDLEVBQUU7QUFBQSxNQUN6RDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFFQSxTQUFPO0FBQUEsSUFDTCxVQUFVO0FBQUEsSUFDVixXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixJQUFJO0FBQUEsUUFDTjtBQUFBLFFBQ0EsWUFBWSxFQUFFLFFBQVEsYUFBYSxJQUFJLEtBQUs7QUFBQSxRQUM1QyxVQUFVLEVBQUUsUUFBUSxhQUFhLElBQUksS0FBSztBQUFBLFFBQzFDLFdBQVcsRUFBRSxRQUFRLGFBQWEsSUFBSSxLQUFLO0FBQUEsUUFDM0MsV0FBVyxFQUFFLFFBQVEsYUFBYSxJQUFJLEtBQUs7QUFBQSxNQUM3QztBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
