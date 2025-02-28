import {Asset} from "../../models/Asset";
import {Job} from "../../models/Job";
import {AssetSet} from "../../models/AssetSet";
import {Item} from "../../models/Item";
import {jobList} from "./store";

export class AvailabilityCalculator {
    static dateBetween(start: Date, end: Date, date: Date) {
        return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
    }

    static assetIsAvailable(asset: Asset, date: Date, existingDates: { startTime: Date, endTime: Date }[]) {
        const filteredDates = existingDates.filter(d => AvailabilityCalculator.dateBetween(d.startTime, d.endTime, date));
        return filteredDates.length < asset.count;
    }

    static getJobsWithAsset(jobs: Job[], asset: Asset) {
        return jobs.filter(job => job.assets.some(a => a.id === asset.id) || job.sets.some(s => s.assets.some(a => a.id === asset.id)));
    }

    // TODO: Rewrite at some point íf reenabling overbooking
    static jobAvailabilityErrors(job: Job, existingJobs: Job[]) {
        const assetsWithErrors = [];
        for (const asset of job.assets) {
            const existingJobsWithAsset = this.getJobsWithAsset(existingJobs, asset).filter(j => j.id !== job.id);
            const datesFromJobs = existingJobsWithAsset.map(job => {
                return {
                    startTime: this.startDate(job.startTime, -1),
                    endTime: this.endDate(job.endTime, -1),
                };
            });
            const jobDates = this.getDatesFromJob(job);
            for (const date of jobDates) {
                if (!this.assetIsAvailable(asset, date, datesFromJobs)) {
                    assetsWithErrors.push({
                        asset,
                        date,
                    });
                }
            }
        }
        return assetsWithErrors;
    }

    static startDate(startTime: number, offset: number) {
        const start = new Date(startTime);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() + offset);
        return start;
    }

    static endDate(endTime: number, offset: number) {
        const end = new Date(endTime);
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() + offset);
        return end;
    }

    static getDatesFromJob(job: Job) {
        const start = this.startDate(job.startTime, -1);
        const end = this.endDate(job.endTime, -1);
        const daysBetween = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        const dates = [];
        for (let i = 0; i < daysBetween; i++) {
            dates.push(new Date(start.getTime() + (i * 1000 * 60 * 60 * 24)));
        }
        return dates;
    }
}

export function hasJobOverlap(job: Job, excludeJob: Job|null = null) {
    if (!excludeJob) {
        return true;
    }
    const excludeJobStart = new Date(excludeJob.startTime).getTime();
    const excludeJobEnd = new Date(excludeJob.endTime).getTime();
    const jobStart = new Date(job.startTime).getTime();
    const jobEnd = new Date(job.endTime).getTime();
    return excludeJobStart < jobEnd && excludeJobEnd > jobStart;
}

export function getCountInJobs(jobs: Job[], id: string, excludeJobId: string|null = null) {
    const excludeJob = jobs.find(j => j.id === excludeJobId);

    return jobs.reduce((total, job) => {
        if (excludeJob) {
            if (excludeJobId === job.id || !hasJobOverlap(job, excludeJob)) {
                return total;
            }
        }

        let add = 0;
        const assetsSet = job.sets.find(i => i.assets.some(a => a.id === id));
        if (assetsSet) {
            const asset = assetsSet.assets.find(i => i.id === id);
            if (assetsSet.quantity) {
                add += assetsSet.quantity * asset.quantity;
            } else {
                add += asset.quantity;
            }
        }

        const asset = job.assets.find(i => i.id === id);
        if (asset) {
            add += asset.quantity;
        }

        const set = job.sets.find(i => i.id === id);
        if (set) {
            add += set.quantity;
        }
        return total + add;
    }, 0);
}

export function getMinQuantityFromSet(set: AssetSet, excludeJobId: string|null = null) {
    return set.assets.reduce((prev, cur) => {
        const count = cur.count - getCountInJobs(jobList.value, cur.id, excludeJobId);
        if (count < prev) {
            return count;
        }
        return prev;
    }, Infinity);
}

export function itemsFromAssetsAndSets(a: Asset[], s: AssetSet[], jobId: string|null = null) {
    return a.map(ass => itemFromAsset(ass, jobId))
        .concat(s.map(set => itemFromSet(set, jobId)) as Item[]);
}

export function itemFromAsset(asset: Asset, jobId: string|null = null) {
    return <Item<Asset>>{
        id: asset.id,
        name: asset.manufacturer + " " + asset.model,
        type: "asset",
        dayCount: asset.days,
        quantity: asset.quantity,
        entity: asset,
        maxQuantity: asset.count - getCountInJobs(jobList.value, asset.id, jobId),
    };
}

export function itemFromSet(set: AssetSet, jobId: string|null = null) {
    return <Item<AssetSet>>{
        id: set.id,
        name: set.setName,
        type: "set",
        entity: set,
        dayCount: set.days,
        quantity: set.quantity,
        maxQuantity: getMinQuantityFromSet(set, jobId),
        content: set.assets,
    };
}
