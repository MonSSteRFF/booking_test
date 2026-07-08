import { Badge, Button, Group, Loader, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchBookingById } from "../api/bookings";
import type { Booking } from "../types";

export const BookingDetailPage = () => {
	const { id } = useParams<{ id: string }>();
	const [booking, setBooking] = useState<Booking | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			fetchBookingById(id)
				.then(setBooking)
				.finally(() => setLoading(false));
		}
	}, [id]);

	if (loading) return <Loader />;
	if (!booking) return <Text>Booking not found</Text>;

	return (
		<>
			<Title order={2}>Booking Details</Title>
			<Group mt="md">
				<Text>Slot: {booking.slotTitle}</Text>
				<Badge color={booking.status === "ACTIVE" ? "green" : "red"}>
					{booking.status}
				</Badge>
			</Group>
			<Text>
				Starts: {dayjs(booking.slotStartsAt).format("YYYY-MM-DD HH:mm")}
			</Text>
			<Text>
				Client: {booking.clientName} ({booking.clientEmail})
			</Text>
			<Text size="xs" c="dimmed">
				Created: {dayjs(booking.createdAt).format("LLL")}
			</Text>
			<Button component={Link} to="/bookings" variant="outline" mt="md">
				Back to Bookings
			</Button>
		</>
	);
};
