import { notifications } from "@mantine/notifications";
import axios from "axios";

const client = axios.create({
	baseURL: "/api",
	timeout: 10000,
});

// Перехватчик для добавления токена
client.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Перехватчик ответов: общая обработка ошибок (401, тосты)
client.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem("token");
			window.location.href = "/login";
		} else if (error.response?.data?.details?.field_errors) {
			// тосты показываются в компонентах, здесь можно не дублировать
		} else if (error.response?.data?.message) {
			notifications.show({
				title: "Error",
				message: error.response.data.message,
				color: "red",
			});
		}
		return Promise.reject(error);
	},
);

export default client;
