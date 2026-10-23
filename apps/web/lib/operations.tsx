import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Route, Siren, Truck, type LucideIcon } from "lucide-react";

export type PageKey = "overview" | "operations" | "batches" | "dispatch" | "volunteers" | "shelters" | "safety" | "analytics" | "settings";
export type BatchStatus = "AVAILABLE" | "RESERVED" | "PICKUP_CONFIRMED" | "IN_TRANSIT" | "PARTIALLY_DELIVERED" | "DELIVERED" | "EXPIRED" | "CANCELLED" | "REQUIRES_REVIEW";
export type DonationCategory = "meals" | "ration" | "medical" | "infant" | "hygiene";
export type Urgency = "critical" | "urgent" | "normal";

export type Location = { latitude: number; longitude: number; label: string };
export type DonationBatch = {
  id: string;
  donor: string;
  description: string;
  category: DonationCategory;
  quantity: number;
  availableQuantity: number;
  unit: string;
  status: BatchStatus;
  urgency: Urgency;
  safetyDeadline: string;
  pickupArea: string;
  handling: string;
  location: Location;
};
export type Rider = { id: string; name: string; initials: string; status: "available" | "busy" | "offline" | "unavailable"; vehicle: string; capacity: number; currentLoad: number; lastCheckIn: string; location: Location };
export type Shelter = { id: string; name: string; status: "open" | "closed"; capacity: number; remainingDemand: number; facilities: string[]; location: Location };
export type Recommendation = { id: string; batchId: string; riderName: string; pickup: string; destination: string; quantity: number; feasible: boolean; score: number; eta: string; safetyMargin: string; reason: string };
export type Assignment = { id: string; batchId: string; riderId: string; destination: string; quantity: number; status: "RESERVED" | "IN_TRANSIT" | "DELIVERED" | "REROUTED" };
export type ActivityEntry = { id: string; message: string; time: string; tone: "green" | "amber" | "red" | "blue"; icon: LucideIcon };
export type SafetyEvent = { id: string; time: string; batchId: string; destination: string; allowed: boolean; reason: string };
export type Profile = { name: string; email: string; role: string };
export type OperationsState = {
  batches: DonationBatch[];
  riders: Rider[];
  shelters: Shelter[];
  assignments: Assignment[];
  recommendations: Recommendation[];
  activity: ActivityEntry[];
  safetyEvents: SafetyEvent[];
  analytics: { delivered: number; recovered: number; expired: number; timeouts: number };
  profile: Profile;
  lastUpdated: string;
};

export type CreateBatchInput = {
  donor: string;
  description: string;
  category: DonationCategory;
  quantity: number;
  unit: string;
  safetyDeadline: string;
  pickupArea: string;
  handling: string;
  latitude: number;
  longitude: number;
};
export type CreateRiderInput = { name: string; vehicle: string; capacity: number };
export type CreateShelterInput = { name: string; capacity: number; remainingDemand: number; facilities: string[]; latitude: number; longitude: number };
export type SimulationEvent =
  | { type: "CREATE_BATCH"; input: CreateBatchInput }
  | { type: "UPDATE_BATCH"; id: string; input: Partial<CreateBatchInput> }
  | { type: "DELETE_BATCH"; id: string }
  | { type: "CREATE_RIDER"; input: CreateRiderInput }
  | { type: "UPDATE_RIDER"; id: string; input: Partial<CreateRiderInput> }
  | { type: "CREATE_SHELTER"; input: CreateShelterInput }
  | { type: "UPDATE_SHELTER"; id: string; input: Partial<CreateShelterInput> }
  | { type: "RIDER_UNRESPONSIVE"; riderId: string }
  | { type: "DEMAND_ZERO"; shelterId: string }
  | { type: "REPLAN" }
  | { type: "UPDATE_PROFILE"; profile: Profile };

export const emptyOperations: OperationsState = {
  batches: [],
  riders: [],
  shelters: [],
  assignments: [],
  recommendations: [],
  activity: [],
  safetyEvents: [],
  analytics: { delivered: 0, recovered: 0, expired: 0, timeouts: 0 },
  profile: { name: "Operations lead", email: "", role: "Administrator" },
  lastUpdated: new Date(0).toISOString(),
};

const iconFor = (tone: ActivityEntry["tone"]): LucideIcon => tone === "red" ? Siren : tone === "amber" ? AlertTriangle : tone === "blue" ? Route : CheckCircle2;
const nowLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const activity = (message: string, tone: ActivityEntry["tone"]): ActivityEntry => ({ id: crypto.randomUUID(), message, time: "just now", tone, icon: iconFor(tone) });
const deadlineMinutes = (deadline: string) => Math.round((new Date(deadline).getTime() - Date.now()) / 60000);
const urgencyFor = (deadline: string): Urgency => { const minutes = deadlineMinutes(deadline); return minutes <= 30 ? "critical" : minutes <= 90 ? "urgent" : "normal"; };

export function createBatch(input: CreateBatchInput): DonationBatch {
  const safetyDeadline = new Date(input.safetyDeadline).toISOString();
  return {
    id: `LM-${Date.now().toString().slice(-6)}`,
    donor: input.donor,
    description: input.description,
    category: input.category,
    quantity: input.quantity,
    availableQuantity: input.quantity,
    unit: input.unit,
    status: "AVAILABLE",
    urgency: urgencyFor(safetyDeadline),
    safetyDeadline,
    pickupArea: input.pickupArea,
    handling: input.handling,
    location: { latitude: input.latitude, longitude: input.longitude, label: input.pickupArea },
  };
}

export function applyOperationalEvent(current: OperationsState, event: SimulationEvent): OperationsState {
  let next = current;
  if (event.type === "CREATE_BATCH") {
    const batch = createBatch(event.input);
    next = { ...current, batches: [batch, ...current.batches], activity: [activity(`${batch.id} created and is available for dispatch`, "green"), ...current.activity] };
  } else if (event.type === "UPDATE_BATCH") {
    next = { ...current, batches: current.batches.map((batch) => batch.id !== event.id ? batch : { ...batch, ...event.input, ...(event.input.safetyDeadline ? { safetyDeadline: new Date(event.input.safetyDeadline).toISOString(), urgency: urgencyFor(event.input.safetyDeadline) } : {}), ...(event.input.latitude !== undefined || event.input.longitude !== undefined ? { location: { ...batch.location, latitude: event.input.latitude ?? batch.location.latitude, longitude: event.input.longitude ?? batch.location.longitude } } : {}) }), activity: [activity(`${event.id} updated`, "blue"), ...current.activity] };
  } else if (event.type === "DELETE_BATCH") {
    next = { ...current, batches: current.batches.filter((batch) => batch.id !== event.id), assignments: current.assignments.filter((assignment) => assignment.batchId !== event.id), activity: [activity(`${event.id} deleted`, "amber"), ...current.activity] };
  } else if (event.type === "CREATE_RIDER") {
    const rider: Rider = { id: `r-${Date.now().toString().slice(-6)}`, name: event.input.name, initials: event.input.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), status: "available", vehicle: event.input.vehicle, capacity: event.input.capacity, currentLoad: 0, lastCheckIn: "just now", location: { latitude: 0, longitude: 0, label: "Not set" } };
    next = { ...current, riders: [rider, ...current.riders], activity: [activity(`${rider.name} joined the volunteer network`, "green"), ...current.activity] };
  } else if (event.type === "UPDATE_RIDER") {
    next = { ...current, riders: current.riders.map((rider) => rider.id === event.id ? { ...rider, ...event.input } : rider), activity: [activity(`${event.id} updated`, "blue"), ...current.activity] };
  } else if (event.type === "CREATE_SHELTER") {
    const shelter: Shelter = { id: `shelter-${Date.now().toString().slice(-6)}`, name: event.input.name, status: "open", capacity: event.input.capacity, remainingDemand: event.input.remainingDemand, facilities: event.input.facilities, location: { latitude: event.input.latitude, longitude: event.input.longitude, label: event.input.name } };
    next = { ...current, shelters: [shelter, ...current.shelters], activity: [activity(`${shelter.name} added to the receiving network`, "green"), ...current.activity] };
  } else if (event.type === "UPDATE_SHELTER") {
    next = { ...current, shelters: current.shelters.map((shelter) => shelter.id === event.id ? { ...shelter, ...event.input, ...(event.input.latitude !== undefined || event.input.longitude !== undefined ? { location: { ...shelter.location, latitude: event.input.latitude ?? shelter.location.latitude, longitude: event.input.longitude ?? shelter.location.longitude } } : {}) } : shelter), activity: [activity(`${event.id} updated`, "blue"), ...current.activity] };
  } else if (event.type === "RIDER_UNRESPONSIVE") {
    const rider = current.riders.find((candidate) => candidate.id === event.riderId);
    const assignment = current.assignments.find((candidate) => candidate.riderId === event.riderId && candidate.status === "RESERVED");
    next = { ...current, riders: rider ? current.riders.map((candidate) => candidate.id === event.riderId ? { ...candidate, status: "offline", currentLoad: 0, lastCheckIn: "timeout" } : candidate) : current.riders, assignments: assignment ? current.assignments.map((candidate) => candidate.id === assignment.id ? { ...candidate, status: "REROUTED" } : candidate) : current.assignments, batches: assignment ? current.batches.map((batch) => batch.id === assignment.batchId ? { ...batch, availableQuantity: Math.min(batch.quantity, batch.availableQuantity + assignment.quantity), status: "AVAILABLE" } : batch) : current.batches, analytics: assignment ? { ...current.analytics, recovered: current.analytics.recovered + assignment.quantity, timeouts: current.analytics.timeouts + 1 } : current.analytics, activity: [activity(assignment ? `${rider?.name ?? "Rider"} timed out; ${assignment.quantity} units released for reassignment` : `${rider?.name ?? "Rider"} marked unavailable`, "red"), ...current.activity] };
  } else if (event.type === "DEMAND_ZERO") {
    const shelter = current.shelters.find((candidate) => candidate.id === event.shelterId);
    next = shelter ? { ...current, shelters: current.shelters.map((candidate) => candidate.id === event.shelterId ? { ...candidate, remainingDemand: 0, status: "closed" } : candidate), activity: [activity(`${shelter.name} demand closed; new assignments are blocked`, "blue"), ...current.activity] } : current;
  } else if (event.type === "REPLAN") {
    const recommendations = current.batches.flatMap((batch) => current.shelters.filter((shelter) => shelter.status === "open" && shelter.remainingDemand > 0).slice(0, 3).map((shelter, index) => ({ id: `${batch.id}-${shelter.id}`, batchId: batch.id, riderName: current.riders.find((rider) => rider.status === "available")?.name ?? "No available rider", pickup: batch.pickupArea, destination: shelter.name, quantity: Math.min(batch.availableQuantity, shelter.remainingDemand), feasible: current.riders.some((rider) => rider.status === "available" && rider.capacity - rider.currentLoad >= Math.min(batch.availableQuantity, shelter.remainingDemand)) && deadlineMinutes(batch.safetyDeadline) > 10, score: Math.max(0, 100 - index * 9 - Math.max(0, 30 - deadlineMinutes(batch.safetyDeadline))), eta: "Set by routing service", safetyMargin: `${Math.max(0, deadlineMinutes(batch.safetyDeadline) - 15)} min`, reason: current.riders.length === 0 ? "Add an available rider before dispatching." : `Available quantity is ${batch.availableQuantity} ${batch.unit}; receiver demand is ${shelter.remainingDemand}.` })));
    next = { ...current, recommendations, activity: [activity("Dispatch plan recalculated from current records", "green"), ...current.activity] };
  } else if (event.type === "UPDATE_PROFILE") {
    next = { ...current, profile: event.profile, activity: [activity("Profile updated", "green"), ...current.activity] };
  }
  return { ...next, lastUpdated: new Date().toISOString(), activity: next.activity.slice(0, 30) };
}

export function refreshUrgency(state: OperationsState): OperationsState {
  return { ...state, batches: state.batches.map((batch) => ({ ...batch, urgency: urgencyFor(batch.safetyDeadline) })), lastUpdated: new Date().toISOString() };
}

export const statusIcon = { Truck, Clock3, RefreshCw };
