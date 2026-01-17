import { describe, it, expect } from "vitest";

describe("Worker Types", () => {
	it("should export ModelCapability type with text-to-image", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");

		const filePath = join(__dirname, "../worker/types.ts");
		const content = readFileSync(filePath, "utf-8");

		expect(content).toContain("ModelCapability");
		expect(content).toContain('"text-to-image"');
	});

	it("should have ModelConfig with capabilities field", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");

		const filePath = join(__dirname, "../worker/types.ts");
		const content = readFileSync(filePath, "utf-8");

		expect(content).toContain("capabilities?: ModelCapability[]");
	});

	it("should include all necessary model types", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");

		const filePath = join(__dirname, "../worker/types.ts");
		const content = readFileSync(filePath, "utf-8");

		expect(content).toContain('"diffusers"');
		expect(content).toContain('"onnx"');
		expect(content).toContain('"cloud"');
		expect(content).toContain('"local"');
		expect(content).toContain('"ncnn"');
		expect(content).toContain('"quantized"');
	});

	it("should include vulkan backend", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");

		const filePath = join(__dirname, "../worker/types.ts");
		const content = readFileSync(filePath, "utf-8");

		expect(content).toContain('"vulkan"');
	});
});
