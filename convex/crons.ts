import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("expire listings", { minutes: 15 }, internal.maintenance.expireDue, {});
crons.daily("purge photos of ended listings", { hourUTC: 11, minuteUTC: 17 }, internal.maintenance.purgeEndedPhotos, {});

export default crons;
