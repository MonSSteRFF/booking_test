import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToken = "test-jwt";
const mockLogin = vi.fn();
const mockLogout = vi.fn();
let mockIsAuthenticated = true;

vi.mock("../context/AuthContext", () => ({
	useAuth: () => ({
		token: mockToken,
		login: mockLogin,
		logout: mockLogout,
		isAuthenticated: mockIsAuthenticated,
	}),
	AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("../api/auth", () => ({ login: vi.fn() }));
vi.mock("../api/slots", () => ({
	fetchSlots: vi.fn(),
	fetchSlotById: vi.fn(),
	createSlot: vi.fn(),
	updateSlot: vi.fn(),
	deactivateSlot: vi.fn(),
}));
vi.mock("../api/bookings", () => ({
	fetchBookings: vi.fn(),
	fetchBookingById: vi.fn(),
	cancelBooking: vi.fn(),
	bookSlot: vi.fn(),
}));

import { login } from "../api/auth";
import {
	bookSlot,
	cancelBooking,
	fetchBookingById,
	fetchBookings,
} from "../api/bookings";
import {
	createSlot,
	deactivateSlot,
	fetchSlotById,
	fetchSlots,
	updateSlot,
} from "../api/slots";
import { Layout } from "../components/Layout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { SlotForm } from "../components/SlotForm";
import { BookingDetailPage } from "../pages/BookingDetailPage";
import { BookingsPage } from "../pages/BookingsPage";
import { LoginPage } from "../pages/LoginPage";
import { SlotDetailPage } from "../pages/SlotDetailPage";
import { SlotsPage } from "../pages/SlotsPage";

import type { Booking, Slot } from "../types";

const sampleSlot: Slot = {
	mongoId: "64f1a2b3c4d5e6f7a8b9c0d1",
	title: "Morning Yoga",
	startsAt: "2026-07-10T09:00:00Z",
	capacity: 20,
	bookedCount: 5,
	isActive: true,
	createdAt: "2026-07-01T12:00:00Z",
	updatedAt: "2026-07-01T12:00:00Z",
};

const sampleBooking: Booking = {
	mongoId: "64f1a2b3c4d5e6f7a8b9c0d2",
	slotId: "64f1a2b3c4d5e6f7a8b9c0d1",
	slotTitle: "Morning Yoga",
	slotStartsAt: "2026-07-10T09:00:00Z",
	clientName: "Ivan",
	clientEmail: "ivan@example.com",
	status: "ACTIVE",
	createdAt: "2026-07-06T10:30:00Z",
	updatedAt: "2026-07-06T10:30:00Z",
};

function Wrapper({
	children,
	initialRoute = "/",
}: {
	children: ReactElement;
	initialRoute?: string;
}) {
	return (
		<MantineProvider>
			<MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
		</MantineProvider>
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockIsAuthenticated = true;
	vi.mocked(login).mockResolvedValue("jwt-abc");
	vi.mocked(fetchSlots).mockResolvedValue({
		data: [sampleSlot],
		totalCount: 1,
	});
	vi.mocked(fetchSlotById).mockResolvedValue(sampleSlot);
	vi.mocked(fetchBookings).mockResolvedValue({
		data: [sampleBooking],
		totalCount: 1,
	});
	vi.mocked(fetchBookingById).mockResolvedValue(sampleBooking);
	vi.mocked(createSlot).mockResolvedValue(sampleSlot);
	vi.mocked(updateSlot).mockResolvedValue(sampleSlot);
	vi.mocked(deactivateSlot).mockResolvedValue({
		...sampleSlot,
		isActive: false,
	});
	vi.mocked(cancelBooking).mockResolvedValue({
		...sampleBooking,
		status: "CANCELLED",
	});
	vi.mocked(bookSlot).mockResolvedValue(sampleBooking);
});

// ------------------------------------------------------------------ //
//  ProtectedRoute
// ------------------------------------------------------------------ //
describe("ProtectedRoute", () => {
	it("renders outlet when authenticated", () => {
		render(
			<Wrapper>
				<Routes>
					<Route element={<ProtectedRoute />}>
						<Route path="/" element={<div>Protected content</div>} />
					</Route>
				</Routes>
			</Wrapper>,
		);
		expect(screen.getByText("Protected content")).toBeInTheDocument();
	});

	it("redirects to /login when not authenticated", () => {
		mockIsAuthenticated = false;
		render(
			<Wrapper>
				<Routes>
					<Route element={<ProtectedRoute />}>
						<Route path="/" element={<div>Protected content</div>} />
					</Route>
					<Route path="/login" element={<div>Login page</div>} />
				</Routes>
			</Wrapper>,
		);
		expect(screen.getByText("Login page")).toBeInTheDocument();
	});
});

// ------------------------------------------------------------------ //
//  Layout
// ------------------------------------------------------------------ //
describe("Layout", () => {
	it("renders header and navigation", () => {
		render(
			<Wrapper>
				<Routes>
					<Route element={<Layout />}>
						<Route path="/" element={<div>Main content</div>} />
					</Route>
				</Routes>
			</Wrapper>,
		);
		expect(screen.getByText("Booking Admin")).toBeInTheDocument();
		expect(screen.getByText("Slots")).toBeInTheDocument();
		expect(screen.getByText("Bookings")).toBeInTheDocument();
		expect(screen.getByText("Logout")).toBeInTheDocument();
		expect(screen.getByText("Main content")).toBeInTheDocument();
	});
});

// ------------------------------------------------------------------ //
//  SlotForm
// ------------------------------------------------------------------ //
describe("SlotForm", () => {
	it("renders create form with empty fields", () => {
		const onSuccess = vi.fn();
		render(
			<Wrapper>
				<SlotForm slot={null} onSuccess={onSuccess} />
			</Wrapper>,
		);
		expect(screen.getByRole("textbox", { name: "Title" })).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Capacity" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
	});

	it("renders edit form with pre-filled values", () => {
		const onSuccess = vi.fn();
		render(
			<Wrapper>
				<SlotForm slot={sampleSlot} onSuccess={onSuccess} />
			</Wrapper>,
		);
		expect(screen.getByDisplayValue("Morning Yoga")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
	});
});

// ------------------------------------------------------------------ //
//  LoginPage
// ------------------------------------------------------------------ //
describe("LoginPage", () => {
	it("renders login form", () => {
		render(
			<Wrapper>
				<LoginPage />
			</Wrapper>,
		);
		expect(screen.getByText("Admin Login")).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Login" })).toBeInTheDocument();
		expect(screen.getByText("Password")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
	});
});

// ------------------------------------------------------------------ //
//  SlotsPage
// ------------------------------------------------------------------ //
describe("SlotsPage", () => {
	it("renders table with slots and pagination", async () => {
		render(
			<Wrapper>
				<Routes>
					<Route path="/" element={<SlotsPage />} />
				</Routes>
			</Wrapper>,
		);
		expect(screen.getByPlaceholderText("Search by title")).toBeInTheDocument();
		expect(screen.getByText("Add Slot")).toBeInTheDocument();
		expect(screen.getByText("Title")).toBeInTheDocument();
		expect(screen.getByText("Starts At")).toBeInTheDocument();
		expect(screen.getByText("Capacity")).toBeInTheDocument();
		expect(screen.getByText("Booked")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();
		expect(screen.getByText("Actions")).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByText("Morning Yoga")).toBeInTheDocument();
		});
	});
});

// ------------------------------------------------------------------ //
//  SlotDetailPage
// ------------------------------------------------------------------ //
describe("SlotDetailPage", () => {
	it("renders slot details after loading", async () => {
		render(
			<Wrapper initialRoute="/slots/64f1a2b3c4d5e6f7a8b9c0d1">
				<Routes>
					<Route path="/slots/:id" element={<SlotDetailPage />} />
				</Routes>
			</Wrapper>,
		);
		await waitFor(() => {
			expect(screen.getByText("Morning Yoga")).toBeInTheDocument();
		});
		expect(screen.getByText("Back to Slots")).toBeInTheDocument();
		expect(fetchSlotById).toHaveBeenCalledWith("64f1a2b3c4d5e6f7a8b9c0d1");
	});
});

// ------------------------------------------------------------------ //
//  BookingsPage
// ------------------------------------------------------------------ //
describe("BookingsPage", () => {
	it("renders bookings table", async () => {
		render(
			<Wrapper>
				<Routes>
					<Route path="/" element={<BookingsPage />} />
				</Routes>
			</Wrapper>,
		);
		expect(screen.getByPlaceholderText("Filter by status")).toBeInTheDocument();
		expect(screen.getByText("Slot Title")).toBeInTheDocument();
		expect(screen.getByText("Client Name")).toBeInTheDocument();
		expect(screen.getByText("Email")).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByText("Ivan")).toBeInTheDocument();
		});
	});
});

// ------------------------------------------------------------------ //
//  BookingDetailPage
// ------------------------------------------------------------------ //
describe("BookingDetailPage", () => {
	it("renders booking details after loading", async () => {
		render(
			<Wrapper initialRoute="/bookings/64f1a2b3c4d5e6f7a8b9c0d2">
				<Routes>
					<Route path="/bookings/:id" element={<BookingDetailPage />} />
				</Routes>
			</Wrapper>,
		);
		await waitFor(() => {
			expect(screen.getByText("Booking Details")).toBeInTheDocument();
		});
		expect(screen.getByText(/Morning Yoga/)).toBeInTheDocument();
		expect(screen.getByText(/ivan@example.com/)).toBeInTheDocument();
		expect(screen.getByText("Back to Bookings")).toBeInTheDocument();
		expect(fetchBookingById).toHaveBeenCalledWith("64f1a2b3c4d5e6f7a8b9c0d2");
	});
});
