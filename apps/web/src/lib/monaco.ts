import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JSONWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import CSSWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HTMLWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import TSWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import darkTheme from "#assets/json/dark-theme.json";
import lightTheme from "#assets/json/light-theme.json";

declare global {
  interface Window {
    MonacoEnvironment: monaco.Environment;
  }
}

monaco.editor.defineTheme("dark", { ...darkTheme, base: "vs-dark" });
monaco.editor.defineTheme("light", { ...lightTheme, base: "vs-dark" });
monaco.editor.defineTheme("dark-contrast", {
  ...darkTheme,
  colors: {
    ...darkTheme.colors,
    "editor.background": "#1f2937",
    "editorWidget.background": "#111827"
  },
  base: "vs-dark"
});
monaco.editor.defineTheme("light-contrast", {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    "editor.background": "#f3f4f6",
    "editorWidget.background": "#f9fafb"
  },
  base: "vs-dark"
});
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
});
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  noUnusedLocals: false
});
monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  enableSchemaRequest: true,
  schemas: [
    {
      uri: `http${window.location.protocol.includes("https") ? "s" : ""}://${
        import.meta.env.PUBLIC_API_HOST
      }/workspace-settings/schemas/prettier`,
      fileMatch: ["prettierrc.json"]
    }
  ]
});
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new JSONWorker();
    }

    if (label === "css" || label === "scss" || label === "less") {
      return new CSSWorker();
    }

    if (label === "html" || label === "handlebars" || label === "razor") {
      return new HTMLWorker();
    }

    if (label === "typescript" || label === "javascript") {
      return new TSWorker();
    }

    return new EditorWorker();
  }
};

export { monaco };
