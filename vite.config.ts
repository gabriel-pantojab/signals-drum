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
  plugins: [dts()],
});
