// Mock Activity feed for the design preview. Events follow docs/spec.md;
// copy follows the brand voice (warm, dependable, quietly witty).
export type MockEvent = {
  id: string;
  who?: string; // the other person, shown as an avatar circle (none = from Domi)
  title: string;
  body?: string;
  hoursAgo: number;
  unread: boolean;
  giving?: boolean; // a giving moment gets the Poppy dot
  itemId?: string;
};

export const events: MockEvent[] = [
  {
    id: "e1",
    who: "Maya",
    title: "Maya picked you for the jogging stroller.",
    body: "Message her to set up pickup.",
    hoursAgo: 0.3,
    unread: true,
    giving: true,
    itemId: "stroller",
  },
  {
    id: "e2",
    who: "Priya",
    title: "Priya asked for your camping chairs.",
    body: "“Taking the kids to Tilden this weekend. These would be perfect.”",
    hoursAgo: 1,
    unread: true,
    itemId: "chairs",
  },
  {
    id: "e3",
    who: "Sam",
    title: "Sam has a high chair for you.",
    body: "It was on your wishlist. Message Sam to set up pickup.",
    hoursAgo: 5,
    unread: false,
    giving: true,
  },
  {
    id: "e4",
    who: "Dana",
    title: "Passed on. The winter coat is yours.",
    body: "Want to thank Dana?",
    hoursAgo: 22,
    unread: false,
    giving: true,
    itemId: "coat",
  },
  {
    id: "e5",
    who: "Jordan",
    title: "Jordan joined 🍼 Baby Shower.",
    body: "They used your invite link.",
    hoursAgo: 26,
    unread: false,
  },
  {
    id: "e6",
    who: "Priya",
    title: "New message about the brass desk lamp.",
    hoursAgo: 30,
    unread: false,
    itemId: "lamp",
  },
  {
    id: "e7",
    title: "Your toaster listing ended after 30 days.",
    body: "Still have it? Post it again in one tap.",
    hoursAgo: 72,
    unread: false,
  },
];

export function agoLabel(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
