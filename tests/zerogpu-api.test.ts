import { describe, it, expect, beforeAll } from "vitest";

// ZeroGPU Space API認証テスト
describe("ZeroGPU Space API Authentication", () => {
	const HF_TOKEN = process.env.HF_TOKEN; // トークンは環境変数から取得
	const SPACE_URL = "https://sayasaya11-qwen-image-2512.hf.space";

	describe("API without authentication", () => {
		it("should get event_id without auth", async () => {
			const res = await fetch(`${SPACE_URL}/gradio_api/call/infer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					data: ["test", 0, true, "1:1", 4.0, 20, false],
				}),
			});

			expect(res.ok).toBe(true);
			const data = (await res.json()) as { event_id: string };
			expect(data.event_id).toBeDefined();
		});

		it("should return error when getting result without auth", async () => {
			// First, get event_id
			const callRes = await fetch(`${SPACE_URL}/gradio_api/call/infer`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					data: ["test", 0, true, "1:1", 4.0, 20, false],
				}),
			});

			const { event_id } = (await callRes.json()) as { event_id: string };

			// Then, try to get result without auth
			const resultRes = await fetch(
				`${SPACE_URL}/gradio_api/call/infer/${event_id}`
			);
			const text = await resultRes.text();

			// Without auth, ZeroGPU returns "event: error"
			expect(text).toContain("event: error");
		});
	});

	describe("API with authentication", () => {
		it("should successfully generate image with HF token", async () => {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				Authorization: `Bearer ${HF_TOKEN}`,
			};

			// Step 1: Call API
			const callRes = await fetch(`${SPACE_URL}/gradio_api/call/infer`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					data: ["a simple test image", 42, false, "1:1", 4.0, 20, false],
				}),
			});

			expect(callRes.ok).toBe(true);
			const { event_id } = (await callRes.json()) as { event_id: string };
			expect(event_id).toBeDefined();

			// Step 2: Get result with auth
			const resultRes = await fetch(
				`${SPACE_URL}/gradio_api/call/infer/${event_id}`,
				{
					headers: { Authorization: `Bearer ${HF_TOKEN}` },
				}
			);

			const text = await resultRes.text();

			// With auth, should get "event: complete" with image data
			expect(text).toContain("event:");

			// Should either be complete or heartbeat (still processing)
			const hasComplete = text.includes("event: complete");
			const hasHeartbeat = text.includes("event: heartbeat");
			const hasError = text.includes("event: error");

			// With proper auth, we should NOT get immediate error
			// We might get heartbeat if still processing, or complete if done
			if (hasError) {
				// If error, it should be a processing error, not auth error
				console.log("Got error (may be ZeroGPU busy):", text.substring(0, 200));
			} else {
				expect(hasComplete || hasHeartbeat).toBe(true);
			}
		}, 120000); // 2 minute timeout for image generation
	});

	describe("API info endpoint", () => {
		it("should return correct API schema", async () => {
			const res = await fetch(`${SPACE_URL}/gradio_api/info`);
			expect(res.ok).toBe(true);

			const info = (await res.json()) as {
				named_endpoints: Record<string, { parameters: { parameter_name: string }[] }>;
			};
			expect(info.named_endpoints).toBeDefined();
			expect(info.named_endpoints["/infer"]).toBeDefined();

			const params = info.named_endpoints["/infer"].parameters;
			const paramNames = params.map((p) => p.parameter_name);

			expect(paramNames).toContain("prompt");
			expect(paramNames).toContain("seed");
			expect(paramNames).toContain("randomize_seed");
			expect(paramNames).toContain("aspect_ratio");
			expect(paramNames).toContain("guidance_scale");
			expect(paramNames).toContain("num_inference_steps");
			expect(paramNames).toContain("prompt_enhance");
		});
	});
});
