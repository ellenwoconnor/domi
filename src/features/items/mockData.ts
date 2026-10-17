// Mock data for the design preview. Replaced by Convex queries in M3.

export type Circle = { id: string; name: string; emoji: string; kind: "zip" | "custom" };

export type ItemStatus = "available" | "pending";

export type Item = {
  id: string;
  title: string;
  description: string;
  emoji: string; // stands in for the photo
  owner: string;
  area: string; // approximate area only, never an address
  distanceMi: number;
  postedHoursAgo: number;
  circleIds: string[];
  status: ItemStatus;
};

export const circles: Circle[] = [
  { id: "zip-94610", name: "94610", emoji: "📍", kind: "zip" },
  { id: "baby", name: "Baby Shower", emoji: "🍼", kind: "custom" },
  { id: "maple", name: "Maple St", emoji: "🌳", kind: "custom" },
];

export const items: Item[] = [
  {
    id: "crib",
    title: "White oak crib",
    description:
      "Solid crib, converts to a toddler bed. Mattress not included. Some teething marks on one rail. Comes apart with an Allen key, which I'll tape to it.",
    emoji: "🛏️",
    owner: "Ellen",
    area: "Crocker Highlands",
    distanceMi: 0.4,
    postedHoursAgo: 2,
    circleIds: ["zip-94610", "baby"],
    status: "available",
  },
  {
    id: "bike",
    title: "Kids' balance bike",
    description: "Blue, 12 inch wheels. Good for ages 2 to 4. Tires hold air fine.",
    emoji: "🚲",
    owner: "Sam",
    area: "Lakeshore",
    distanceMi: 0.7,
    postedHoursAgo: 5,
    circleIds: ["zip-94610"],
    status: "available",
  },
  {
    id: "monstera",
    title: "Monstera cuttings",
    description: "Rooted in water, three of them. Bring a jar or I'll wrap them in wet paper towel.",
    emoji: "🪴",
    owner: "Priya",
    area: "Maple St",
    distanceMi: 0.1,
    postedHoursAgo: 9,
    circleIds: ["maple"],
    status: "available",
  },
  {
    id: "stroller",
    title: "Jogging stroller",
    description: "Front wheel locks, fits in a Civic trunk folded. Canopy has a small tear.",
    emoji: "👶",
    owner: "Maya",
    area: "Trestle Glen",
    distanceMi: 0.9,
    postedHoursAgo: 20,
    circleIds: ["zip-94610", "baby"],
    status: "pending",
  },
  {
    id: "books",
    title: "Box of board books",
    description: "About 25 books. Sandra Boynton, Eric Carle, a few lift-the-flap ones with flaps intact.",
    emoji: "📚",
    owner: "Jordan",
    area: "Crocker Highlands",
    distanceMi: 0.3,
    postedHoursAgo: 26,
    circleIds: ["baby"],
    status: "available",
  },
  {
    id: "boxes",
    title: "Moving boxes, about 20",
    description: "Mixed sizes, flattened. Plus a roll of bubble wrap.",
    emoji: "📦",
    owner: "Alex",
    area: "Lakeshore",
    distanceMi: 0.6,
    postedHoursAgo: 30,
    circleIds: ["zip-94610", "maple"],
    status: "available",
  },
  {
    id: "lamp",
    title: "Brass desk lamp",
    description: "Works, takes a regular bulb. Shade is slightly dented on the back.",
    emoji: "💡",
    owner: "Priya",
    area: "Maple St",
    distanceMi: 0.1,
    postedHoursAgo: 48,
    circleIds: ["maple"],
    status: "available",
  },
  {
    id: "coat",
    title: "Kids' winter coat, 4T",
    description: "Red puffer, warm, zipper works. Worn one season.",
    emoji: "🧥",
    owner: "Dana",
    area: "Trestle Glen",
    distanceMi: 1.1,
    postedHoursAgo: 52,
    circleIds: ["zip-94610", "baby"],
    status: "available",
  },
  {
    id: "chairs",
    title: "Two camping chairs",
    description: "Fold into bags. One cup holder is cracked.",
    emoji: "🏕️",
    owner: "Sam",
    area: "Lakeshore",
    distanceMi: 0.7,
    postedHoursAgo: 70,
    circleIds: ["zip-94610"],
    status: "available",
  },
  {
    id: "lego",
    title: "Bin of Lego",
    description: "Mostly classic bricks, some wheels and minifigs. No instructions.",
    emoji: "🧱",
    owner: "Jordan",
    area: "Crocker Highlands",
    distanceMi: 0.3,
    postedHoursAgo: 96,
    circleIds: ["maple", "baby"],
    status: "available",
  },
];

export function getItem(id: string) {
  return items.find((i) => i.id === id);
}

export function circleById(id: string) {
  return circles.find((c) => c.id === id);
}

export function postedLabel(hours: number) {
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
