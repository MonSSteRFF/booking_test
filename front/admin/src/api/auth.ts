import client from "./client";

export const authApi = {
	login: async (login: string, password: string): Promise<string> => {
		const { data, error } = await client.POST("/auth/login", {
			body: { login, password },
		});
		if (error) throw error;
		if (!data?.token) throw new Error("Failed to login");
		return data.token;
	},
};
