import { Badge, Group, Pagination, Select, Table } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconEye, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { bookingsApi } from "@/api";
import { getErrorMessage } from "@/api/errors";
import type { Booking, FetchManyBookings } from "@/api/types";
import { useNavigateParams } from "@/app/Router/useNavigateParams";
import { Layout } from "@/components/Layout";

export const BookingsPage = () => {
	const navigate = useNavigateParams();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const pageSize = 20;
	const [sortField, setSortField] = useState("createdAt");
	const [sortDesc, setSortDesc] = useState(true);
	const [statusFilter, setStatusFilter] = useState<string | null>(null);
	const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortDesc(!sortDesc);
		} else {
			setSortField(field);
			setSortDesc(false);
		}
	};

	const load = useCallback(async () => {
		const params: FetchManyBookings = {
			pageIndex: page - 1,
			pageSize,
			sorting: [{ id: sortField, desc: sortDesc }],
			columnFilters: [],
			dateRange:
				dateRange[0] && dateRange[1]
					? {
							from: Math.floor(new Date(dateRange[0]).getTime() / 1000),
							to: Math.floor(new Date(dateRange[1]).getTime() / 1000),
							field: "created_at",
						}
					: undefined,
		};
		if (statusFilter) {
			params.columnFilters.push({
				id: "status",
				value: statusFilter,
				filterFn: "in",
			});
		}
		try {
			const res = await bookingsApi.fetchBookings(params);
			setBookings(res.data);
			setTotal(res.totalCount);
		} catch (err: unknown) {
			console.error(err);
			notifications.show({ message: "Failed to load bookings", color: "red" });
		}
	}, [page, statusFilter, dateRange, sortField, sortDesc]);

	useEffect(() => {
		load();
	}, [load]);

	const handleCancel = async (id: string) => {
		try {
			await bookingsApi.cancelBooking(id);
			notifications.show({ message: "Booking cancelled", color: "green" });
			load();
		} catch (err: unknown) {
			console.error(err);
			notifications.show({ message: getErrorMessage(err), color: "red" });
		}
	};

	const rows = bookings.map((b) => (
		<Table.Tr key={b.mongoId}>
			<Table.Td>{b.slotTitle}</Table.Td>
			<Table.Td>{dayjs.unix(b.slotStartsAt).format("YYYY-MM-DD HH:mm")}</Table.Td>
			<Table.Td>{b.clientName}</Table.Td>
			<Table.Td>{b.clientEmail}</Table.Td>
			<Table.Td>
				<Badge color={b.status === "ACTIVE" ? "green" : "red"}>{b.status}</Badge>
			</Table.Td>
			<Table.Td>
				<Group gap="xs">
					<IconEye size={16} style={{ cursor: "pointer" }} onClick={() => navigate(`/bookings/${b.mongoId}`)} />
					{b.status === "ACTIVE" && <IconX size={16} color="red" style={{ cursor: "pointer" }} onClick={() => handleCancel(b.mongoId)} />}
				</Group>
			</Table.Td>
		</Table.Tr>
	));

	return (
		<Layout>
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
				<DatePickerInput type="range" placeholder="Pick dates range" value={dateRange} onChange={setDateRange} clearable />
			</Group>
			<Table striped>
			<Table.Thead>
				<Table.Tr>
					<Table.Th onClick={() => handleSort("slotTitle")} style={{ cursor: "pointer" }}>
						Slot Title {sortField === "slotTitle" ? (sortDesc ? "↓" : "↑") : ""}
					</Table.Th>
					<Table.Th onClick={() => handleSort("slotStartsAt")} style={{ cursor: "pointer" }}>
						Starts At {sortField === "slotStartsAt" ? (sortDesc ? "↓" : "↑") : ""}
					</Table.Th>
					<Table.Th onClick={() => handleSort("clientName")} style={{ cursor: "pointer" }}>
						Client Name {sortField === "clientName" ? (sortDesc ? "↓" : "↑") : ""}
					</Table.Th>
					<Table.Th>Email</Table.Th>
					<Table.Th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
						Status {sortField === "status" ? (sortDesc ? "↓" : "↑") : ""}
					</Table.Th>
					<Table.Th>Actions</Table.Th>
				</Table.Tr>
			</Table.Thead>
				<Table.Tbody>{rows}</Table.Tbody>
			</Table>
			<Group mt="md" justify="center">
				<Pagination value={page} onChange={setPage} total={Math.ceil(total / pageSize)} />
			</Group>
		</Layout>
	);
};
