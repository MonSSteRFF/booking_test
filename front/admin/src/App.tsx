import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { BookingsPage } from "./pages/BookingsPage";
import { LoginPage } from "./pages/LoginPage";
import { SlotDetailPage } from "./pages/SlotDetailPage";
import { SlotsPage } from "./pages/SlotsPage";

export const App = () => {
	const { isAuthenticated } = useAuth();

	return (
		<Routes>
			<Route
				path="/login"
				element={isAuthenticated ? <Navigate to="/slots" /> : <LoginPage />}
			/>
			<Route element={<ProtectedRoute />}>
				<Route element={<Layout />}>
					<Route path="/slots" element={<SlotsPage />} />
					<Route path="/slots/:id" element={<SlotDetailPage />} />
					<Route path="/bookings" element={<BookingsPage />} />
					<Route path="/bookings/:id" element={<BookingDetailPage />} />
					<Route path="*" element={<Navigate to="/slots" />} />
				</Route>
			</Route>
		</Routes>
	);
};
