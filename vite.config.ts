import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), wasm()],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
	optimizeDeps: {
		exclude: ["@assemblyscript/loader", "web-txt2img", "@xenova/transformers"]
	},
	assetsInclude: ['**/*.wgsl']
});
