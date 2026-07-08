import { Badge, Button, Group, Loader, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchSlotById } from "../api/slots";
import type { Slot } from "../types";

export const SlotDetailPage = () => {
	const { id } = useParams<{ id: string }>();
	const [slot, setSlot] = useState<Slot | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			fetchSlotById(id)
				.then(setSlot)
				.finally(() => setLoading(false));
		}
	}, [id]);

	if (loading) return <Loader />;
	if (!slot) return <Text>Slot not found</Text>;

	return (
		<>
			<Title order={2}>{slot.title}</Title>
			<Group mt="md">
				<Text>Starts: {dayjs(slot.startsAt).format("YYYY-MM-DD HH:mm")}</Text>
				<Badge color={slot.isActive ? "green" : "red"}>
					{slot.isActive ? "Active" : "Inactive"}
				</Badge>
			</Group>
			<Text mt="sm">Capacity: {slot.capacity}</Text>
			<Text>Booked: {slot.bookedCount}</Text>
			<Text size="xs" c="dimmed">
				Created: {dayjs(slot.createdAt).format("LLL")}
			</Text>
			<Button component={Link} to="/slots" variant="outline" mt="md">
				Back to Slots
			</Button>
		</>
	);
};
