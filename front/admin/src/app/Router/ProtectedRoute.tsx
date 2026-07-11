import React from "react";
import { Redirect, Route } from "wouter";
import { useAuth } from "../Providers/AuthContext";

interface IProps {
	needAuth?: boolean;
	component: React.FC;
	path: string;
}

export const ProtectedRoute: React.FC<IProps> = ({ needAuth = true, component, path }) => {
	const { isAuthenticated } = useAuth();

	if (needAuth && !isAuthenticated) {
		return <Redirect to={"/login"} />;
	}
	if (!needAuth && isAuthenticated) {
		return <Redirect to={"/slots"} />;
	}

	return <Route path={path} component={component} />;
};
