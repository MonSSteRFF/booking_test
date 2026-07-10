import createClient from "openapi-fetch";
import type { paths } from "./internal-schema";

const client = createClient<paths>({
	baseUrl: "/api",
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
			return Response.redirect("/login");
		}
		return undefined;
	},
});

export default client;
