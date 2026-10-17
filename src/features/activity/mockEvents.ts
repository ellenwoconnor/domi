// Mock Activity feed for the design preview. Copy follows the events table in docs/spec.md.
export type MockEvent = {
  id: string;
  emoji: string;
  title: string;
  body?: string;
  hoursAgo: number;
  unread: boolean;
  itemId?: string;
};

export const events: MockEvent[] = [
  {
    id: "e1",
    emoji: "🎉",
    title: "You were picked for the jogging stroller!",
    body: "Message Maya to arrange pickup.",
    hoursAgo: 0.3,
    unread: true,
    itemId: "stroller",
  },
  {
    id: "e2",
    emoji: "🙋",
    title: "Priya requested your camping chairs",
    body: "“Going to Big Sur next weekend, would love these!”",
    hoursAgo: 1,
    unread: true,
    itemId: "chairs",
  },
  {
    id: "e3",
    emoji: "🎁",
    title: "Sam has a high chair for you!",
    body: "From your wishlist. Message Sam to arrange pickup.",
    hoursAgo: 5,
    unread: false,
  },
  {
    id: "e4",
    emoji: "🍼",
    title: "Jordan joined Baby Shower",
    body: "They used your invite link.",
    hoursAgo: 26,
    unread: false,
  },
  {
    id: "e5",
    emoji: "💬",
    title: "New message about the brass desk lamp",
    hoursAgo: 30,
    unread: false,
    itemId: "lamp",
  },
  {
    id: "e6",
    emoji: "⏳",
    title: "Your toaster listing expired",
    body: "Repost it if it's still up for grabs.",
    hoursAgo: 72,
    unread: false,
  },
];

export function agoLabel(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
