export const KINDS = [
  "obstacle",
  "start",
  "end",
  "poi",
  "viewpoint",
  "turn",
  "hazard",
  "camp",
  "entrance",
  "fuel",
  "water",
  "gate",
  "parking",
  "other",
] as const;

export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  obstacle: "Obstacle",
  start: "Start",
  end: "End",
  poi: "PoI",
  viewpoint: "Viewpoint",
  turn: "Turn",
  hazard: "Hazard",
  camp: "Camp",
  entrance: "Entrance",
  fuel: "Fuel",
  water: "Water",
  gate: "Gate",
  parking: "Parking",
  other: "Other",
};

export const KIND_COLOUR: Record<Kind, string> = {
  obstacle: "#7b1fa2",
  start: "#1565c0",
  end: "#b71c1c",
  poi: "#00838f",
  viewpoint: "#5e35b1",
  turn: "#f9a825",
  hazard: "#c62828",
  camp: "#2e7d32",
  entrance: "#ef6c00",
  fuel: "#6d4c41",
  water: "#0277bd",
  gate: "#455a64",
  parking: "#37474f",
  other: "#616161",
};
