import type { FetchManyParams, PaginatedResponse, Slot } from "../types";
import client from "./client";

export async function fetchSlots(
	params: FetchManyParams,
): Promise<PaginatedResponse<Slot>> {
	const { data } = await client.post("/slots/fetch/many", params);
	return data;
}

export async function fetchSlotById(id: string): Promise<Slot> {
	const { data } = await client.get(`/slots/fetch/one/${id}`);
	return data;
}

export async function createSlot(slot: {
	title: string;
	startsAt: string;
	capacity: number;
}) {
	const { data } = await client.post("/slots", slot);
	return data as Slot;
}

export async function updateSlot(
	id: string,
	slot: { title?: string; startsAt?: string; capacity?: number },
) {
	const { data } = await client.patch(`/slots/${id}`, slot);
	return data as Slot;
}

export async function deactivateSlot(id: string) {
	const { data } = await client.post(`/slots/${id}/deactivate`);
	return data as Slot;
}
