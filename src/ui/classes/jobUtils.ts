import {dayAsTime} from "./time";
import {Job} from "../../models/Job";

export function getMaxDaysFromJobs(jobs: Job[]) {
    let max = 0;
    for (const job of jobs) {
        const endTime = new Date(job.endTime).getTime();
        const diff = (endTime - dayAsTime(0, 0)) / 1000 / 60 / 60 / 24;
        max = Math.max(max, diff);
    }
    return Math.max(max, 14);
}

export function compareJobsByStartTime(a: Job, b: Job) {
    const aTime = new Date(a.startTime).getTime();
    const bTime = new Date(b.startTime).getTime();
    return aTime - bTime;
}