// Move-to-Room mini-game's floor plan -- authoritative definition of every room, its
// floor/grid position, and whether it's a staircase cell. See
// concept/mini-games/move-to-room-and-guess-random-appointed-guest.md "Floor plans"
// for the reasoning behind this exact layout. Only Ground Floor and First Floor exist
// for v1 -- Second Floor/Attic/Basement aren't accessible yet per mansion.md.

export type RoomId =
  | "library"
  | "entrance_hall"
  | "living_room"
  | "dining_room"
  | "kitchen"
  | "toilet"
  | "guest_bedroom_1"
  | "landing"
  | "master_bedroom"
  | "guest_bedroom_2"
  | "bathroom";

export type Floor = "ground" | "first";

interface RoomDef {
  id: RoomId;
  floor: Floor;
  col: "A" | "B" | "C";
  row: 1 | 2;
  isStaircase: boolean;
}

// Both floors share the same 3x2 (A-C, 1-2) coordinate system on purpose -- it's what
// lets the two staircase cells (Entrance Hall, Landing) line up at the same B1
// coordinate and connect floors without an arbitrary teleport.
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

// Every player starts here -- see the doc's own note on why it's the Kitchen and not
// the Toilet (crime scene, not a gathering spot).
export const STARTING_ROOM: RoomId = "kitchen";

export function isValidRoomId(value: unknown): value is RoomId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ROOMS, value);
}

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

// Every legal destination from a room: itself (an explicit "stay"), any room connected
// by a doorway on the same floor, and -- only when standing on a staircase cell -- the
// matching staircase cell on the connected floor.
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
