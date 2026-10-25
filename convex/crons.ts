import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("expire listings", { minutes: 15 }, internal.maintenance.expireDue, {});
crons.interval("circle activity pushes", { minutes: 30 }, internal.circleActivity.processDue, {});
crons.daily("purge photos of ended listings", { hourUTC: 11, minuteUTC: 17 }, internal.maintenance.purgeEndedPhotos, {});
crons.daily("purge uploads never attached to a listing", { hourUTC: 11, minuteUTC: 47 }, internal.maintenance.purgeOrphanUploads, {});

export default crons;
