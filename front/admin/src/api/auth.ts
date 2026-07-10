import client from "./client";

export async function login(login: string, password: string): Promise<string> {
	const { data, error } = await client.POST("/auth/login", {
		body: { login, password },
	});
	if (error) throw error;
	return data?.token!;
}
