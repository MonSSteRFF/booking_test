import { Button, Group, NumberInput, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { slotsApi } from "@/api";
import { getFieldErrors, getErrorMessage } from "@/api/errors";
import type { Slot } from "@/api/types";

interface Props {
	slot: Slot | null;
	onSuccess: () => void;
}

export function SlotForm({ slot, onSuccess }: Props) {
	const [loading, setLoading] = useState(false);

	const { setValues, reset, values, onSubmit, getInputProps, setFieldError } = useForm({
		initialValues: {
			title: "",
			startsAt: new Date(),
			capacity: 10,
		},
		validate: {
			title: (value) => {
				if (!value.trim()) return "Title is required";
				if (value.length > 200) return "Title must be at most 200 characters";
				return null;
			},
			startsAt: (value) => (value ? null : "Invalid date"),
			capacity: (value) => (value >= 1 && value <= 1000 ? null : "Capacity must be between 1 and 1000"),
		},
	});

	useEffect(() => {
		if (slot) {
			setValues({
				title: slot.title,
				startsAt: new Date(slot.startsAt * 1000),
				capacity: slot.capacity,
			});
		} else {
			reset();
		}
	}, [slot, setValues, reset]);

	const handleSubmit = async (body: typeof values) => {
		setLoading(true);
		try {
			const payload = {
				title: body.title,
				startsAt: Math.floor(body.startsAt.getTime() / 1000),
				capacity: body.capacity,
			};
			if (slot) {
				await slotsApi.updateSlot(slot.mongoId, payload);
				notifications.show({ message: "Slot updated", color: "green" });
			} else {
				await slotsApi.createSlot(payload);
				notifications.show({ message: "Slot created", color: "green" });
			}
			onSuccess();
		} catch (err) {
			const fieldErrors = getFieldErrors(err);
			if (fieldErrors.length > 0) {
				for (const fe of fieldErrors) {
					setFieldError(fe.field, fe.message);
				}
				notifications.show({ message: "Проверьте ошибки в полях формы", color: "red" });
			} else {
				notifications.show({ message: getErrorMessage(err), color: "red" });
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={onSubmit(handleSubmit)}>
			<TextInput label="Title" {...getInputProps("title")} required />
			<DateTimePicker label="Starts At" valueFormat="YYYY-MM-DD HH:mm" {...getInputProps("startsAt")} required mt="sm" />
			<NumberInput label="Capacity" {...getInputProps("capacity")} min={1} max={1000} required mt="sm" />
			<Group justify="flex-end" mt="md">
				<Button type="submit" loading={loading}>
					{slot ? "Update" : "Create"}
				</Button>
			</Group>
		</form>
	);
}
