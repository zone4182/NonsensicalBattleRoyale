// Mirrors supabase/functions/_shared/mansion.ts -- kept as a separate copy since the
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

function sameFloorAdjacent(a: RoomDef, b: RoomDef): boolean {
  if (a.floor !== b.floor) return false;
  const colDist = Math.abs(a.col.charCodeAt(0) - b.col.charCodeAt(0));
  const rowDist = Math.abs(a.row - b.row);
  return colDist + rowDist === 1;
}

export function validDestinations(from: RoomId): RoomId[] {
  const fromDef = ROOMS[from];
  const destinations = new Set<RoomId>([from]);
  for (const room of Object.values(ROOMS)) {
    if (sameFloorAdjacent(fromDef, room)) destinations.add(room.id);
  }
  if (fromDef.isStaircase) {
    const otherFloor: Floor = fromDef.floor === "ground" ? "first" : "ground";
    const match = Object.values(ROOMS).find(
      (r) => r.floor === otherFloor && r.isStaircase && r.col === fromDef.col && r.row === fromDef.row,
    );
    if (match) destinations.add(match.id);
  }
  return [...destinations];
}
