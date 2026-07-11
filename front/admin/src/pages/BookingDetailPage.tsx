import { Badge, Button, Group, Loader, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { bookingsApi } from "@/api";
import type { Booking } from "@/api/types";
import { paths } from "@/app/Router/Paths";
import { Layout } from "@/components/Layout";

export const BookingDetailPage = () => {
	const [_, bookingPageParams] = useRoute<{ id: string }>(paths.BOOKING_PAGE_ID);
	const [booking, setBooking] = useState<Booking | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (bookingPageParams?.id) {
			bookingsApi
				.fetchBookingById(bookingPageParams.id)
				.then(setBooking)
				.finally(() => setLoading(false));
		}
	}, [bookingPageParams?.id]);

	if (loading) return <Loader />;
	if (!booking) return <Text>Booking not found</Text>;

	return (
		<Layout>
			<Title order={2}>Booking Details</Title>
			<Group mt="md">
				<Text>Slot: {booking.slotTitle}</Text>
				<Badge color={booking.status === "ACTIVE" ? "green" : "red"}>{booking.status}</Badge>
			</Group>
			<Text>Starts: {dayjs.unix(booking.slotStartsAt).format("YYYY-MM-DD HH:mm")}</Text>
			<Text>
				Client: {booking.clientName} ({booking.clientEmail})
			</Text>
			<Text size="xs" c="dimmed">
				Created: {dayjs.unix(booking.createdAt).format("LLL")}
			</Text>
			<Button component={Link} to={paths.BOOKINGS_PAGE} variant="outline" mt="md">
				Back to Bookings
			</Button>
		</Layout>
	);
};
