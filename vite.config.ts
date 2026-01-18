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
		exclude: ["@assemblyscript/loader", "onnxruntime-web", "web-txt2img", "@xenova/transformers"]
	},
	build: {
		rollupOptions: {
			external: (id) => {
				// onnxruntime-webとそのサブパスをすべて外部化
				if (id.includes('onnxruntime-web')) return true;
				// @xenova/transformersも外部化
				if (id.includes('@xenova/transformers')) return true;
				// web-txt2imgも外部化
				if (id.includes('web-txt2img')) return true;
				return false;
			},
			// unresolved importsを警告からエラーに昇格させない
			onwarn(warning, warn) {
				// unresolved importの警告を無視
				if (warning.code === 'UNRESOLVED_IMPORT') return;
				warn(warning);
			}
		}
	},
	assetsInclude: ['**/*.wgsl']
});
