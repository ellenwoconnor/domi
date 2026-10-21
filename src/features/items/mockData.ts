// Mock data for the design preview. Replaced by Convex queries in M3.

export type Circle = { id: string; name: string; emoji?: string; kind: "zip" | "custom"; zip?: string };

export type ItemStatus = "available" | "pending";

export type Item = {
  id: string;
  title: string;
  description: string;
  emoji: string; // stands in for the photo
  caption: string; // one-line curator's note about the object
  owner: string;
  area: string; // approximate area only, never an address
  distanceMi: number;
  postedHoursAgo: number;
  circleIds: string[];
  status: ItemStatus;
};

export const circles: Circle[] = [
  { id: "home", name: "Kensington", kind: "zip", zip: "94707" },
  { id: "baby", name: "Baby Shower", emoji: "🍼", kind: "custom" },
  { id: "spruce", name: "Spruce St", emoji: "🌳", kind: "custom" },
];

export const items: Item[] = [
  {
    id: "crib",
    title: "White oak crib",
    caption: "Two kids slept well in it. Ready for a third.",
    description:
      "Solid crib that converts to a toddler bed. Mattress not included. Some teething marks on one rail. Comes apart with an Allen key, which I'll tape to it.",
    emoji: "🛏️",
    owner: "Ellen",
    area: "Kensington",
    distanceMi: 0.4,
    postedHoursAgo: 2,
    circleIds: ["home", "baby"],
    status: "available",
  },
  {
    id: "bike",
    title: "Balance bike",
    caption: "Outgrown, not outrun.",
    description: "Blue, 12 inch wheels. Good for ages 2 to 4. Tires hold air fine.",
    emoji: "🚲",
    owner: "Sam",
    area: "Thousand Oaks",
    distanceMi: 0.7,
    postedHoursAgo: 5,
    circleIds: ["home"],
    status: "available",
  },
  {
    id: "monstera",
    title: "Monstera cuttings",
    caption: "Grown on a north-facing windowsill. Not fussy.",
    description: "Three cuttings, rooted in water. Bring a jar or I'll wrap them in wet paper towel.",
    emoji: "🪴",
    owner: "Priya",
    area: "Spruce St",
    distanceMi: 0.1,
    postedHoursAgo: 9,
    circleIds: ["spruce"],
    status: "available",
  },
  {
    id: "stroller",
    title: "Jogging stroller",
    caption: "Has climbed every hill between here and Tilden.",
    description: "Front wheel locks. Folds into a Civic trunk. Canopy has a small tear.",
    emoji: "👶",
    owner: "Maya",
    area: "El Cerrito Hills",
    distanceMi: 0.9,
    postedHoursAgo: 20,
    circleIds: ["home", "baby"],
    status: "pending",
  },
  {
    id: "books",
    title: "Box of board books",
    caption: "Read aloud, many times over.",
    description: "About 25 books. Sandra Boynton, Eric Carle, and a few lift-the-flaps with their flaps intact.",
    emoji: "📚",
    owner: "Jordan",
    area: "Kensington",
    distanceMi: 0.3,
    postedHoursAgo: 26,
    circleIds: ["baby"],
    status: "available",
  },
  {
    id: "boxes",
    title: "Moving boxes, about 20",
    caption: "One move done, plenty left in them.",
    description: "Mixed sizes, flattened. Plus most of a roll of bubble wrap.",
    emoji: "📦",
    owner: "Alex",
    area: "Westbrae",
    distanceMi: 1.2,
    postedHoursAgo: 30,
    circleIds: ["home", "spruce"],
    status: "available",
  },
  {
    id: "lamp",
    title: "Brass desk lamp",
    caption: "Lit about a decade of homework.",
    description: "Works and takes a regular bulb. The shade is slightly dented on the back.",
    emoji: "💡",
    owner: "Priya",
    area: "Spruce St",
    distanceMi: 0.1,
    postedHoursAgo: 48,
    circleIds: ["spruce"],
    status: "available",
  },
  {
    id: "coat",
    title: "Winter coat, 4T",
    caption: "One winter in, plenty of warmth left.",
    description: "Red puffer. Warm, and the zipper works. Worn one season.",
    emoji: "🧥",
    owner: "Dana",
    area: "Arlington",
    distanceMi: 0.6,
    postedHoursAgo: 52,
    circleIds: ["home", "baby"],
    status: "available",
  },
  {
    id: "chairs",
    title: "Two camping chairs",
    caption: "Veterans of several Tilden picnics.",
    description: "Fold into their bags. One cup holder is cracked.",
    emoji: "🏕️",
    owner: "Sam",
    area: "Thousand Oaks",
    distanceMi: 0.7,
    postedHoursAgo: 70,
    circleIds: ["home"],
    status: "available",
  },
  {
    id: "lego",
    title: "Bin of Lego",
    caption: "Sorted by no one, loved by everyone.",
    description: "Mostly classic bricks, some wheels and minifigs. No instructions.",
    emoji: "🧱",
    owner: "Jordan",
    area: "Kensington",
    distanceMi: 0.3,
    postedHoursAgo: 96,
    circleIds: ["spruce", "baby"],
    status: "available",
  },
];

/** Quiet impact proof for the feed footer. */
export const passedOnThisMonth = 42;

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

export function circleLabel(c: Circle) {
  return c.emoji ? `${c.emoji} ${c.name}` : c.name;
}
