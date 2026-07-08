import client from "./client";

export async function login(login: string, password: string): Promise<string> {
	const { data } = await client.post("/auth/login", { login, password });
	return data.token;
}
