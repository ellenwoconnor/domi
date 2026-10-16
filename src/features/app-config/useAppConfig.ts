import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";

/** Live-subscribed read of one appConfig row. */
export function useAppConfig(key: string) {
  return useQuery(convexQuery(api.appConfig.get, { key }));
}
