import createClient from "openapi-fetch";
import type { paths } from "./internal-schema";

const client = createClient<paths>({
	baseUrl: import.meta.env.VITE_API_BASE_URL,
});

client.use({
	async onRequest({ request }) {
		const token = localStorage.getItem("token");
		if (token) {
			request.headers.set("Authorization", `Bearer ${token}`);
		}
		return undefined;
	},
	async onResponse({ response }) {
		if (response.status === 401) {
			localStorage.removeItem("token");
			window.location.href = "/login";
		}
		return undefined;
	},
});

export default client;
