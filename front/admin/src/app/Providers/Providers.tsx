import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import React from "react";
import { AuthProvider } from "./AuthContext";

const theme = createTheme({});

interface IProps {
	children: React.ReactNode;
}

export const Providers: React.FC<IProps> = ({ children }) => {
	return (
		<MantineProvider theme={theme}>
			<Notifications position="top-right" />
			<AuthProvider>{children}</AuthProvider>
		</MantineProvider>
	);
};
