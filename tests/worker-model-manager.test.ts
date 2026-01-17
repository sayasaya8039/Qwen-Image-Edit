import { describe, it, expect } from "vitest";

// worker/model-manager.tsの内容を読み込んでパースするテスト
describe("Worker Model Manager", () => {
	it("should contain Qwen-Image-2512 in defaultConfig", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");

		const filePath = join(__dirname, "../worker/model-manager.ts");
		const content = readFileSync(filePath, "utf-8");

		expect(content).toContain('id: "qwen-image-2512"');
		expect(content).toContain('name: "Qwen-Image-2512"');
		expect(content).toContain("https://sayasaya11-qwen-image-2512.hf.space");
	});

	it("should have text-to-image capability for Qwen-Image-2512", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");

		const filePath = join(__dirname, "../worker/model-manager.ts");
		const content = readFileSync(filePath, "utf-8");

		// qwen-image-2512エントリの後にcapabilitiesがあることを確認
		const qwenIndex = content.indexOf('id: "qwen-image-2512"');
		expect(qwenIndex).toBeGreaterThan(-1);

		const afterQwen = content.substring(qwenIndex, qwenIndex + 500);
		expect(afterQwen).toContain("text-to-image");
	});
});
