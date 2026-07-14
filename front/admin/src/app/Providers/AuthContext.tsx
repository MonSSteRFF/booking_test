import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface AuthContextType {
	token: string | null;
	login: (token: string) => void;
	logout: () => void;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
	token: null,
	login: () => {},
	logout: () => {},
	isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

	useEffect(() => {
		if (token) {
			localStorage.setItem("token", token);
		} else {
			localStorage.removeItem("token");
		}
	}, [token]);

	const login = (newToken: string) => {
		setToken(newToken);
	};

	const logout = () => {
		setToken(null);
	};

	const value: AuthContextType = {
		token,
		login,
		logout,
		isAuthenticated: !!token,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
