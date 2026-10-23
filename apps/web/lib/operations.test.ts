import { describe, expect, test } from "bun:test";
import { applyOperationalEvent, createBatch, emptyOperations } from "./operations";

const input = {
  donor: "Test donor",
  description: "Packed meals",
  category: "meals" as const,
  quantity: 40,
  unit: "meals",
  safetyDeadline: new Date(Date.now() + 90 * 60_000).toISOString(),
  pickupArea: "Test kitchen",
  handling: "Covered",
  latitude: 40.7128,
  longitude: -74.006,
};

describe("empty-first operational state", () => {
  test("starts with no operational records", () => {
    expect(emptyOperations.batches).toHaveLength(0);
    expect(emptyOperations.riders).toHaveLength(0);
    expect(emptyOperations.shelters).toHaveLength(0);
  });

  test("creates a batch with available quantity and location", () => {
    const batch = createBatch(input);
    expect(batch.availableQuantity).toBe(40);
    expect(batch.location.latitude).toBe(40.7128);
  });

  test("updates and deletes a batch", () => {
    const created = applyOperationalEvent(emptyOperations, { type: "CREATE_BATCH", input });
    const id = created.batches[0]?.id;
    expect(id).toBeDefined();
    const updated = applyOperationalEvent(created, { type: "UPDATE_BATCH", id: id!, input: { donor: "Updated donor" } });
    expect(updated.batches[0]?.donor).toBe("Updated donor");
    const deleted = applyOperationalEvent(updated, { type: "DELETE_BATCH", id: id! });
    expect(deleted.batches).toHaveLength(0);
  });

  test("closes shelter demand and prevents new demand", () => {
    const withShelter = applyOperationalEvent(emptyOperations, { type: "CREATE_SHELTER", input: { name: "Shelter", capacity: 50, remainingDemand: 25, facilities: ["Ready-to-eat"], latitude: 40, longitude: -74 } });
    const id = withShelter.shelters[0]!.id;
    const closed = applyOperationalEvent(withShelter, { type: "DEMAND_ZERO", shelterId: id });
    expect(closed.shelters[0]?.remainingDemand).toBe(0);
    expect(closed.shelters[0]?.status).toBe("closed");
  });
});
