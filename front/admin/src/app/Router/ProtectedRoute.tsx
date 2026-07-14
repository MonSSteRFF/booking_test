import React from "react";
import { Redirect, Route } from "wouter";
import { paths } from "@/app/Router/Paths";
import { useAuth } from "../Providers/AuthContext";

interface IProps {
	needAuth?: boolean;
	component: React.FC;
	path: string;
}

export const ProtectedRoute: React.FC<IProps> = ({ needAuth = true, component, path }) => {
	const { isAuthenticated } = useAuth();

	if (!needAuth && isAuthenticated) {
		return <Redirect to={paths.SLOTS_PAGE} />;
	}

	if (needAuth && !isAuthenticated) {
		return <Redirect to={"/login"} />;
	}

	return <Route path={path} component={component} />;
};
