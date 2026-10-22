/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as appConfig from "../appConfig.js";
import type * as auth from "../auth.js";
import type * as communities from "../communities.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as invites from "../invites.js";
import type * as items from "../items.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_cards from "../lib/cards.js";
import type * as lib_circles from "../lib/circles.js";
import type * as lib_codes from "../lib/codes.js";
import type * as lib_events from "../lib/events.js";
import type * as lib_idTokens from "../lib/idTokens.js";
import type * as lib_lifecycle from "../lib/lifecycle.js";
import type * as lib_photos from "../lib/photos.js";
import type * as lib_redeem from "../lib/redeem.js";
import type * as lib_validate from "../lib/validate.js";
import type * as maintenance from "../maintenance.js";
import type * as mystuff from "../mystuff.js";
import type * as profiles from "../profiles.js";
import type * as requests from "../requests.js";
import type * as safety from "../safety.js";
import type * as shares from "../shares.js";
import type * as users from "../users.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  appConfig: typeof appConfig;
  auth: typeof auth;
  communities: typeof communities;
  conversations: typeof conversations;
  crons: typeof crons;
  http: typeof http;
  init: typeof init;
  invites: typeof invites;
  items: typeof items;
  "lib/access": typeof lib_access;
  "lib/cards": typeof lib_cards;
  "lib/circles": typeof lib_circles;
  "lib/codes": typeof lib_codes;
  "lib/events": typeof lib_events;
  "lib/idTokens": typeof lib_idTokens;
  "lib/lifecycle": typeof lib_lifecycle;
  "lib/photos": typeof lib_photos;
  "lib/redeem": typeof lib_redeem;
  "lib/validate": typeof lib_validate;
  maintenance: typeof maintenance;
  mystuff: typeof mystuff;
  profiles: typeof profiles;
  requests: typeof requests;
  safety: typeof safety;
  shares: typeof shares;
  users: typeof users;
  wishlist: typeof wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
