import { Badge, Group, Pagination, Select, Table } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconEye, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cancelBooking, fetchBookings } from "../api/bookings";
import type { Booking, FetchManyParams } from "../types";

export const BookingsPage = () => {
	const navigate = useNavigate();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const pageSize = 20;
	const [statusFilter, setStatusFilter] = useState<string | null>(null);

	const load = useCallback(async () => {
		const params: FetchManyParams = {
			pageIndex: page - 1,
			pageSize,
			sorting: [{ id: "createdAt", desc: true }],
			columnFilters: [],
		};
		if (statusFilter) {
			params.columnFilters.push({
				id: "status",
				value: [statusFilter],
				filterFn: "in",
			});
		}
		try {
			const res = await fetchBookings(params);
			setBookings(res.data);
			setTotal(res.totalCount);
		} catch (err: unknown) {
			console.error(err);
			notifications.show({ message: "Failed to load bookings", color: "red" });
		}
	}, [page, statusFilter]);

	useEffect(() => {
		load();
	}, [load]);

	const handleCancel = async (id: string) => {
		try {
			await cancelBooking(id);
			notifications.show({ message: "Booking cancelled", color: "green" });
			load();
		} catch (err: unknown) {
			console.error(err);
			notifications.show({ message: "Cancel failed", color: "red" });
		}
	};

	const rows = bookings.map((b) => (
		<Table.Tr key={b.mongoId}>
			<Table.Td>{b.slotTitle}</Table.Td>
			<Table.Td>{dayjs(b.slotStartsAt).format("YYYY-MM-DD HH:mm")}</Table.Td>
			<Table.Td>{b.clientName}</Table.Td>
			<Table.Td>{b.clientEmail}</Table.Td>
			<Table.Td>
				<Badge color={b.status === "ACTIVE" ? "green" : "red"}>
					{b.status}
				</Badge>
			</Table.Td>
			<Table.Td>
				<Group gap="xs">
					<IconEye
						size={16}
						style={{ cursor: "pointer" }}
						onClick={() => navigate(`/bookings/${b.mongoId}`)}
					/>
					{b.status === "ACTIVE" && (
						<IconX
							size={16}
							color="red"
							style={{ cursor: "pointer" }}
							onClick={() => handleCancel(b.mongoId)}
						/>
					)}
				</Group>
			</Table.Td>
		</Table.Tr>
	));

	return (
		<>
			<Group mb="md">
				<Select
					data={[
						{ value: "ACTIVE", label: "Active" },
						{ value: "CANCELLED", label: "Cancelled" },
					]}
					placeholder="Filter by status"
					clearable
					value={statusFilter}
					onChange={(v) => setStatusFilter(v)}
				/>
			</Group>
			<Table striped>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Slot Title</Table.Th>
						<Table.Th>Starts At</Table.Th>
						<Table.Th>Client Name</Table.Th>
						<Table.Th>Email</Table.Th>
						<Table.Th>Status</Table.Th>
						<Table.Th>Actions</Table.Th>
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>{rows}</Table.Tbody>
			</Table>
			<Group mt="md" justify="center">
				<Pagination
					value={page}
					onChange={setPage}
					total={Math.ceil(total / pageSize)}
				/>
			</Group>
		</>
	);
};
