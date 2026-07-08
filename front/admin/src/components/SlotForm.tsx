import { Button, Group, NumberInput, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { createSlot, updateSlot } from "../api/slots";
import type { Slot } from "../types";

interface Props {
	slot: Slot | null;
	onSuccess: () => void;
}

export function SlotForm({ slot, onSuccess }: Props) {
	const [loading, setLoading] = useState(false);

	const form = useForm({
		initialValues: {
			title: "",
			startsAt: new Date(),
			capacity: 10,
		},
		validate: {
			title: (value) => (value.trim().length > 0 ? null : "Title is required"),
			startsAt: (value) => (value ? null : "Invalid date"),
			capacity: (value) =>
				value >= 1 && value <= 1000
					? null
					: "Capacity must be between 1 and 1000",
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: form dont need in useEffect
	useEffect(() => {
		if (slot) {
			form.setValues({
				title: slot.title,
				startsAt: new Date(slot.startsAt),
				capacity: slot.capacity,
			});
		} else {
			form.reset();
		}
	}, [slot]);

	const handleSubmit = async (values: typeof form.values) => {
		setLoading(true);
		try {
			const payload = {
				title: values.title,
				startsAt: values.startsAt.toISOString(),
				capacity: values.capacity,
			};
			if (slot) {
				await updateSlot(slot.mongoId, payload);
				notifications.show({ message: "Slot updated", color: "green" });
			} else {
				await createSlot(payload);
				notifications.show({ message: "Slot created", color: "green" });
			}
			onSuccess();
		} catch (err: any) {
			const fieldErrors = err.response?.data?.details?.field_errors;
			if (fieldErrors) {
				const errors: Record<string, string> = {};
				fieldErrors.forEach((e: any) => {
					errors[e.field] = e.message;
				});
				form.setErrors(errors);
			} else {
				notifications.show({ message: "Save failed", color: "red" });
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={form.onSubmit(handleSubmit)}>
			<TextInput label="Title" {...form.getInputProps("title")} required />
			<DateTimePicker
				label="Starts At"
				valueFormat="YYYY-MM-DD HH:mm"
				{...form.getInputProps("startsAt")}
				required
				mt="sm"
			/>
			<NumberInput
				label="Capacity"
				{...form.getInputProps("capacity")}
				min={1}
				max={1000}
				required
				mt="sm"
			/>
			<Group justify="flex-end" mt="md">
				<Button type="submit" loading={loading}>
					{slot ? "Update" : "Create"}
				</Button>
			</Group>
		</form>
	);
}
