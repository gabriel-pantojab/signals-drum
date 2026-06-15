import { readFile, rm, writeFile } from "fs/promises";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/lib/index.ts"),
      name: "SignalsDrum",
      fileName: "signals-drum",
      formats: ["es", "cjs"],
    },
  },
  plugins: [
    dts(),
    {
      name: "consolite-dts",
      async closeBundle() {
        const rootDtsFile: string = resolve(import.meta.dirname, "dist/src/lib/index.d.ts");
        const pendingFiles: string[] = [rootDtsFile];
        const processedFiles = new Set<string>();
        const declarationBlocks: string[] = [];

        while (pendingFiles.length) {
          const currentFile: string = pendingFiles.pop()!;
          processedFiles.add(currentFile);
          const fileContent: string = await readFile(currentFile, { encoding: "utf-8" });
          const referencedFiles: string[] = [
            ...fileContent.matchAll(/from\s+['"]([^'"]+)['"]\s*;/g),
          ]
            .map(([, importSpecifier]) => importSpecifier)
            .filter(
              (importSpecifier): importSpecifier is string =>
                importSpecifier?.startsWith(".") ?? false,
            )
            .map((importSpecifier) => resolve(currentFile, "..", importSpecifier + ".d.ts"));
          const declarations: string = fileContent
            .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\n?/gm, "")
            .replace(/^import\s+['"][^'"]+['"];?\n?/gm, "")
            .replace(/^export\s+(?:type\s+)?\*\s+from\s+['"][^'"]+['"];?\n?/gm, "")
            .replace(/^export\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"][^'"]+['"];?\n?/gm, "")
            .trimStart();

          if (declarations) declarationBlocks.push(declarations);

          for (const referencedFile of referencedFiles) {
            if (!processedFiles.has(referencedFile)) pendingFiles.push(referencedFile);
          }
        }

        const outputFile: string = resolve(import.meta.dirname, "dist/index.d.ts");
        await writeFile(outputFile, declarationBlocks.join("\n"), { encoding: "utf-8" });
        await rm(resolve(import.meta.dirname, "dist/src"), { recursive: true, force: true });
      },
    },
  ],
});
