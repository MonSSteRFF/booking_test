import type { FetchManyParams, PaginatedResponse, Slot } from "../types";
import client from "./client";

export async function fetchSlots(
	params: FetchManyParams,
): Promise<PaginatedResponse<Slot>> {
	const { data, error } = await client.POST("/slots/fetch/many", {
		body: params as any,
	});
	if (error) throw error;
	return data as PaginatedResponse<Slot>;
}

export async function fetchSlotById(id: string): Promise<Slot> {
	const { data, error } = await client.GET("/slots/fetch/one/{id}", {
		params: { path: { id } },
	});
	if (error) throw error;
	return data as Slot;
}

export async function createSlot(slot: {
	title: string;
	startsAt: string;
	capacity: number;
}): Promise<Slot> {
	const { data, error } = await client.POST("/slots", {
		body: slot as any,
	});
	if (error) throw error;
	return data as Slot;
}

export async function updateSlot(
	id: string,
	slot: { title?: string; startsAt?: string; capacity?: number },
): Promise<Slot> {
	const { data, error } = await client.PATCH("/slots/{id}", {
		params: { path: { id } },
		body: slot as any,
	});
	if (error) throw error;
	return data as Slot;
}

export async function deactivateSlot(id: string): Promise<Slot> {
	const { data, error } = await client.POST("/slots/{id}/deactivate", {
		params: { path: { id } },
	});
	if (error) throw error;
	return data as Slot;
}
