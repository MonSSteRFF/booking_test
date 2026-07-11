import React from "react";
import { Redirect, Route, Switch, Router as WouterRouter } from "wouter";
import { BookingDetailPage } from "../../pages/BookingDetailPage";
import { BookingsPage } from "../../pages/BookingsPage";
import { LoginPage } from "../../pages/LoginPage";
import { SlotDetailPage } from "../../pages/SlotDetailPage";
import { SlotsPage } from "../../pages/SlotsPage";
import { useAuth } from "../Providers/AuthContext";
import { paths } from "./Paths";
import { ProtectedRoute } from "./ProtectedRoute";

export const Router: React.FC = () => {
	const { isAuthenticated } = useAuth();

	return (
		<WouterRouter>
			<Switch>
				<Route path={paths.LOGIN_PAGE}>
					{isAuthenticated ? <Redirect to={paths.SLOTS_PAGE} /> : <LoginPage />}
				</Route>
				<ProtectedRoute path={paths.SLOTS_PAGE} component={SlotsPage} />
				<ProtectedRoute path={paths.SLOT_PAGE_ID} component={SlotDetailPage} />
				<ProtectedRoute path={paths.BOOKINGS_PAGE} component={BookingsPage} />
				<ProtectedRoute
					path={paths.BOOKING_PAGE_ID}
					component={BookingDetailPage}
				/>

				<Route path={"*"}>
					<Redirect to={paths.SLOTS_PAGE} />
				</Route>
			</Switch>
		</WouterRouter>
	);
};
