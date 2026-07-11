import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Root not found!");

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
