import { Queue } from "bullmq";
import { env } from "../config/env";

const connection = {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null as null,
}

const emailDefaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2_000 },
};
const bookingDefaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 30_000 },
  };
export const bookingQueue = new Queue('booking', {
    connection,
    defaultJobOptions: bookingDefaultJobOptions,
});
export const emailQueue = new Queue("email", {
    connection,
    defaultJobOptions: emailDefaultJobOptions,
});