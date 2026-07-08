import {
	ActionIcon,
	Badge,
	Button,
	Group,
	Menu,
	Modal,
	Pagination,
	Select,
	Table,
	TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookSlot } from "../api/bookings";
import { deactivateSlot, fetchSlots } from "../api/slots";
import { SlotForm } from "../components/SlotForm";
import type { FetchManyParams, Slot } from "../types";

export const SlotsPage = () => {
	const navigate = useNavigate();
	const [slots, setSlots] = useState<Slot[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [pageSize, _setPageSize] = useState(10);
	const [sortField, _setSortField] = useState("createdAt");
	const [sortDesc, _setSortDesc] = useState(true);
	const [isActiveFilter, setIsActiveFilter] = useState<string | null>(null);
	const [titleFilter, setTitleFilter] = useState("");
	const [dateRange, _setDateRange] = useState<{
		from: string;
		to: string;
	} | null>(null);
	const [opened, { open, close }] = useDisclosure(false);
	const [editSlot, setEditSlot] = useState<Slot | null>(null);
	const [bookModal, setBookModal] = useState<Slot | null>(null);
	const [clientName, setClientName] = useState("");
	const [clientEmail, setClientEmail] = useState("");

	const loadSlots = useCallback(async () => {
		const params: FetchManyParams = {
			pageIndex: page - 1,
			pageSize,
			sorting: [{ id: sortField, desc: sortDesc }],
			columnFilters: [],
			dateRange: dateRange ? { ...dateRange, field: "starts_at" } : undefined,
		};
		if (isActiveFilter) {
			params.columnFilters.push({
				id: "isActive",
				value: [isActiveFilter],
				filterFn: "in",
			});
		}
		if (titleFilter) {
			params.columnFilters.push({
				id: "title",
				value: titleFilter,
				filterFn: "contains",
			});
		}
		try {
			const res = await fetchSlots(params);
			setSlots(res.data);
			setTotal(res.totalCount);
		} catch (err) {
			notifications.show({ message: "Failed to load slots", color: "red" });
		}
	}, [
		page,
		pageSize,
		sortField,
		sortDesc,
		isActiveFilter,
		titleFilter,
		dateRange,
	]);

	useEffect(() => {
		loadSlots();
	}, [loadSlots]);

	const handleDeactivate = async (id: string) => {
		try {
			await deactivateSlot(id);
			notifications.show({ message: "Slot deactivated", color: "green" });
			loadSlots();
		} catch (err) {
			notifications.show({ message: "Failed to deactivate", color: "red" });
		}
	};

	const handleBook = async () => {
		if (!bookModal) return;
		try {
			await bookSlot(bookModal.mongoId, { clientName, clientEmail });
			notifications.show({ message: "Booking created", color: "green" });
			setBookModal(null);
			loadSlots();
		} catch (err: any) {
			const msg = err.response?.data?.message || "Booking failed";
			notifications.show({ message: msg, color: "red" });
		}
	};

	const rows = slots.map((slot) => (
		<Table.Tr key={slot.mongoId}>
			<Table.Td>{slot.title}</Table.Td>
			<Table.Td>{dayjs(slot.startsAt).format("YYYY-MM-DD HH:mm")}</Table.Td>
			<Table.Td>{slot.capacity}</Table.Td>
			<Table.Td>{slot.bookedCount}</Table.Td>
			<Table.Td>
				<Badge color={slot.isActive ? "green" : "red"}>
					{slot.isActive ? "Active" : "Inactive"}
				</Badge>
			</Table.Td>
			<Table.Td>
				<Group gap="xs">
					<ActionIcon
						variant="subtle"
						onClick={() => navigate(`/slots/${slot.mongoId}`)}
					>
						<IconEye size={16} />
					</ActionIcon>
					<ActionIcon
						variant="subtle"
						onClick={() => {
							setEditSlot(slot);
							open();
						}}
					>
						<IconEdit size={16} />
					</ActionIcon>
					<ActionIcon
						variant="subtle"
						color="red"
						onClick={() => handleDeactivate(slot.mongoId)}
					>
						<IconTrash size={16} />
					</ActionIcon>
					<Menu>
						<Menu.Target>
							<Button size="xs" variant="light">
								Book
							</Button>
						</Menu.Target>
						<Menu.Dropdown>
							<Menu.Item onClick={() => setBookModal(slot)}>
								New booking
							</Menu.Item>
						</Menu.Dropdown>
					</Menu>
				</Group>
			</Table.Td>
		</Table.Tr>
	));

	return (
		<>
			<Group mb="md">
				<TextInput
					placeholder="Search by title"
					value={titleFilter}
					onChange={(e) => setTitleFilter(e.target.value)}
				/>
				<Select
					data={[
						{ value: "true", label: "Active" },
						{ value: "false", label: "Inactive" },
					]}
					placeholder="Status"
					clearable
					value={isActiveFilter}
					onChange={(v) => setIsActiveFilter(v)}
				/>
				<Button
					leftSection={<IconPlus size={16} />}
					onClick={() => {
						setEditSlot(null);
						open();
					}}
				>
					Add Slot
				</Button>
			</Group>
			<Table striped>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Title</Table.Th>
						<Table.Th>Starts At</Table.Th>
						<Table.Th>Capacity</Table.Th>
						<Table.Th>Booked</Table.Th>
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

			{/* Форма создания/редактирования слота */}
			<Modal
				opened={opened}
				onClose={close}
				title={editSlot ? "Edit Slot" : "Create Slot"}
			>
				<SlotForm
					slot={editSlot}
					onSuccess={() => {
						close();
						loadSlots();
					}}
				/>
			</Modal>

			{/* Модалка бронирования */}
			<Modal
				opened={!!bookModal}
				onClose={() => setBookModal(null)}
				title={`Book slot: ${bookModal?.title}`}
			>
				<TextInput
					label="Client name"
					value={clientName}
					onChange={(e) => setClientName(e.target.value)}
				/>
				<TextInput
					label="Client email"
					value={clientEmail}
					onChange={(e) => setClientEmail(e.target.value)}
					mt="sm"
				/>
				<Button fullWidth mt="md" onClick={handleBook}>
					Book
				</Button>
			</Modal>
		</>
	);
};
