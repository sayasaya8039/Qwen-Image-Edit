import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// server/models.jsonを読み込むヘルパー
function loadModelsConfig() {
	const configPath = join(__dirname, "../server/models.json");
	const data = readFileSync(configPath, "utf-8");
	return JSON.parse(data);
}

describe("Models Configuration", () => {
	let config: ReturnType<typeof loadModelsConfig>;

	beforeEach(() => {
		config = loadModelsConfig();
	});

	describe("Qwen-Image-2512 model", () => {
		it("should exist in models list", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel).toBeDefined();
		});

		it("should have correct name", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel?.name).toBe("Qwen-Image-2512");
		});

		it("should be cloud type", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel?.type).toBe("cloud");
		});

		it("should have correct HuggingFace Space URL", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel?.source).toBe("https://sayasaya11-qwen-image-2512.hf.space");
		});

		it("should have cloud backend", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel?.backends).toContain("cloud");
		});

		it("should have text-to-image capability", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel?.capabilities).toContain("text-to-image");
		});

		it("should be enabled", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel?.enabled).toBe(true);
		});

		it("should have valid createdAt date", () => {
			const qwenModel = config.models.find(
				(m: { id: string }) => m.id === "qwen-image-2512"
			);
			expect(qwenModel?.createdAt).toBeDefined();
			expect(new Date(qwenModel?.createdAt).getTime()).not.toBeNaN();
		});
	});

	describe("All models configuration", () => {
		it("should have unique model IDs", () => {
			const ids = config.models.map((m: { id: string }) => m.id);
			const uniqueIds = new Set(ids);
			expect(ids.length).toBe(uniqueIds.size);
		});

		it("should have at least one model", () => {
			expect(config.models.length).toBeGreaterThan(0);
		});

		it("should have valid settings", () => {
			expect(config.settings).toBeDefined();
			expect(config.settings.activeModelId).toBeDefined();
			expect(typeof config.settings.fallbackToCloud).toBe("boolean");
		});

		it("active model should exist in models list", () => {
			const activeModel = config.models.find(
				(m: { id: string }) => m.id === config.settings.activeModelId
			);
			expect(activeModel).toBeDefined();
		});
	});
});
