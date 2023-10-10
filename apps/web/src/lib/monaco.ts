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
    MonacoEnvironment?: monaco.Environment;
  }
}

monaco.editor.defineTheme("dark", { ...darkTheme, base: "vs-dark" });
monaco.editor.defineTheme("light", { ...lightTheme, base: "vs" });
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
});
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  diagnosticCodesToIgnore: [17008, 1005]
});
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  noUnusedLocals: false
});
monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  enableSchemaRequest: true,
  schemas: [
    {
      uri: `${window.env.PUBLIC_API_URL}/workspace-settings/schemas/prettier`,
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
