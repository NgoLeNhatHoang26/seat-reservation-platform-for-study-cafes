import { Queue } from "bullmq";
import { env } from "../config/env";

const connection = {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null as null,
}

export const bookingQueue = new Queue("booking", {connection});
export const emailQueue = new Queue("email", {connection});