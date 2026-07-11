import { Providers } from "./Providers/Providers";
import { Router } from "./Router/Router";

export const App = () => {
	return (
		<Providers>
			<Router />
		</Providers>
	);
};
