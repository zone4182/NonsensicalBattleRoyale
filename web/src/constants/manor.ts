// Mirrors supabase/functions/_shared/manor.ts -- kept as a separate copy since the
// frontend can't import Deno-targeted backend modules. The server is still the
// authority (submit-room-move re-validates), this just drives the grid UI and disables
// illegal cells before a round-trip.
import type { RoomId } from "../stores/game";

export type Floor = "ground" | "first";

interface RoomDef {
  id: RoomId;
  floor: Floor;
  col: "A" | "B" | "C";
  row: 1 | 2;
  isStaircase: boolean;
}

export const ROOMS: Record<RoomId, RoomDef> = {
  library: { id: "library", floor: "ground", col: "A", row: 1, isStaircase: false },
  entrance_hall: { id: "entrance_hall", floor: "ground", col: "B", row: 1, isStaircase: true },
  living_room: { id: "living_room", floor: "ground", col: "C", row: 1, isStaircase: false },
  dining_room: { id: "dining_room", floor: "ground", col: "A", row: 2, isStaircase: false },
  kitchen: { id: "kitchen", floor: "ground", col: "B", row: 2, isStaircase: false },
  toilet: { id: "toilet", floor: "ground", col: "C", row: 2, isStaircase: false },
  guest_bedroom_1: { id: "guest_bedroom_1", floor: "first", col: "A", row: 1, isStaircase: false },
  landing: { id: "landing", floor: "first", col: "B", row: 1, isStaircase: true },
  master_bedroom: { id: "master_bedroom", floor: "first", col: "C", row: 1, isStaircase: false },
  guest_bedroom_2: { id: "guest_bedroom_2", floor: "first", col: "A", row: 2, isStaircase: false },
  bathroom: { id: "bathroom", floor: "first", col: "B", row: 2, isStaircase: false },
};

export const ALL_ROOM_IDS = Object.keys(ROOMS) as RoomId[];

// First Floor listed above Ground Floor -- physical stacking order, matches the
// resolved "which floor renders on top" design decision.
export const FLOORS_TOP_TO_BOTTOM: Floor[] = ["first", "ground"];

// Same-floor doorways, matching the actual door placements drawn in the reference
// blueprints (concept/story/blueprint-image-prompts.md) rather than plain grid
// adjacency -- e.g. Library and Dining Room sit in adjacent grid cells but the
// blueprint draws no door between them, so that move isn't legal. Kitchen and Landing
// are each a 3-way hub; every other room has exactly one door out.
const ADJACENT_ROOMS: Record<RoomId, RoomId[]> = {
  library: ["entrance_hall"],
  entrance_hall: ["library", "living_room", "kitchen"],
  living_room: ["entrance_hall"],
  dining_room: ["kitchen"],
  kitchen: ["entrance_hall", "dining_room", "toilet"],
  toilet: ["kitchen"],
  guest_bedroom_1: ["landing"],
  landing: ["guest_bedroom_1", "master_bedroom", "bathroom"],
  master_bedroom: ["landing"],
  guest_bedroom_2: ["bathroom"],
  bathroom: ["landing", "guest_bedroom_2"],
};

// Per-room artwork for the main round screen -- shown in place of the generic
// placeholder once a room actually has an image. Every value starts undefined (no
// room images exist yet); fill one in here as art gets produced and it'll pick up
// automatically wherever ROOM_IMAGES is read (currently VoteActionPanel.vue).
export const ROOM_IMAGES: Partial<Record<RoomId, string>> = {
  entrance_hall: "/img/Entrance Hall.png",
};

export function validDestinations(from: RoomId): RoomId[] {
  const fromDef = ROOMS[from];
  const destinations = new Set<RoomId>([from, ...ADJACENT_ROOMS[from]]);
  if (fromDef.isStaircase) {
    const otherFloor: Floor = fromDef.floor === "ground" ? "first" : "ground";
    const match = Object.values(ROOMS).find(
      (r) => r.floor === otherFloor && r.isStaircase && r.col === fromDef.col && r.row === fromDef.row,
    );
    if (match) destinations.add(match.id);
  }
  return [...destinations];
}
