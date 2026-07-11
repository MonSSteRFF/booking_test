import client from "./client";
import type {
	CreateSlot,
	FetchManySlots,
	Slot,
	SlotsList,
	UpdateSlot,
} from "./types";

export const slotsApi = {
	fetchSlots: async (params: FetchManySlots): Promise<SlotsList> => {
		const { data, error } = await client.POST("/slots/fetch/many", {
			body: params,
		});
		if (error) throw error;
		return data;
	},
	fetchSlotById: async (id: string): Promise<Slot> => {
		const { data, error } = await client.GET("/slots/fetch/one/{id}", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	},
	createSlot: async (slot: CreateSlot): Promise<Slot> => {
		const { data, error } = await client.POST("/slots", {
			body: slot,
		});
		if (error) throw error;
		return data;
	},
	updateSlot: async (id: string, slot: UpdateSlot): Promise<Slot> => {
		const { data, error } = await client.PATCH("/slots/{id}", {
			params: { path: { id } },
			body: slot,
		});
		if (error) throw error;
		return data;
	},
	deactivateSlot: async (id: string): Promise<Slot> => {
		const { data, error } = await client.POST("/slots/{id}/deactivate", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	},
};
