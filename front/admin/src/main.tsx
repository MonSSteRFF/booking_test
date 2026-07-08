import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Root not found!");

const theme = createTheme({});

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<MantineProvider theme={theme}>
			<Notifications position="top-right" />
			<BrowserRouter>
				<AuthProvider>
					<App />
				</AuthProvider>
			</BrowserRouter>
		</MantineProvider>
	</React.StrictMode>,
);
