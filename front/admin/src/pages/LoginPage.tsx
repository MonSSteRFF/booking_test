import { Button, Container, Paper, PasswordInput, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import React, { useState } from "react";
import { authApi } from "@/api";
import { getErrorMessage } from "@/api/errors";
import { useAuth } from "@/app/Providers/AuthContext";

export const LoginPage = () => {
	const { login } = useAuth();
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({ login: "", password: "" });

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		try {
			const token = await authApi.login(form.login, form.password);
			login(token);
		} catch (err) {
			notifications.show({
				title: "Login failed",
				message: getErrorMessage(err),
				color: "red",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Container size={420} my={40}>
			<Title ta="center">Admin Login</Title>
			<Paper withBorder shadow="md" p={30} mt={30} radius="md">
				<form onSubmit={handleSubmit}>
					<TextInput
						label="Login"
						placeholder="admin"
						value={form.login}
						onChange={(e) => setForm({ ...form, login: e.currentTarget.value })}
						required
					/>
					<PasswordInput
						label="Password"
						placeholder="Your password"
						mt="md"
						value={form.password}
						onChange={(e) => setForm({ ...form, password: e.currentTarget.value })}
						required
					/>
					<Button fullWidth mt="xl" type="submit" loading={loading}>
						Sign in
					</Button>
				</form>
			</Paper>
		</Container>
	);
};
