/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		environmentOptions: {
			jsdom: {
				url: "http://localhost:5173",
			},
		},
		setupFiles: ["src/__tests__/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
