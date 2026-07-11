import { Badge, Button, Group, Loader, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { slotsApi } from "@/api";
import type { Slot } from "@/api/types";
import { paths } from "@/app/Router/Paths";
import { Layout } from "@/components/Layout";

export const SlotDetailPage = () => {
	const [_, slotsPageParams] = useRoute<{ id: string }>(paths.SLOT_PAGE_ID);

	const [slot, setSlot] = useState<Slot | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (slotsPageParams?.id) {
			slotsApi
				.fetchSlotById(slotsPageParams.id)
				.then(setSlot)
				.finally(() => setLoading(false));
		}
	}, [slotsPageParams?.id]);

	if (loading) return <Loader />;
	if (!slot) return <Text>Slot not found</Text>;

	return (
		<Layout>
			<Title order={2}>{slot.title}</Title>
			<Group mt="md">
				<Text>Starts: {dayjs.unix(slot.startsAt).format("YYYY-MM-DD HH:mm")}</Text>
				<Badge color={slot.isActive ? "green" : "red"}>{slot.isActive ? "Active" : "Inactive"}</Badge>
			</Group>
			<Text mt="sm">Capacity: {slot.capacity}</Text>
			<Text>Booked: {slot.bookedCount}</Text>
			<Text size="xs" c="dimmed">
				Created: {dayjs.unix(slot.createdAt).format("LLL")}
			</Text>
			<Button component={Link} to="/slots" variant="outline" mt="md">
				Back to Slots
			</Button>
		</Layout>
	);
};
