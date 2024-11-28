import {dayAsTime, getPastDateWarning} from "../classes/time";
import {GenericTemplates} from "./generic.templates";
import {Api} from "../classes/api";
import {toast} from "../classes/ui";
import {JobTemplates} from "./job.templates";
import {DayRateCalculator} from "../classes/dayRateCalculator";
import {AvailabilityCalculator} from "../classes/availabilityCalculator";
import {compute, signal, Signal} from "../lib/fjsc/src/signals";
import {Job} from "../../models/Job";
import {create, ifjs, signalMap} from "../lib/fjsc/src/f2";
import {ToastType} from "../enums/ToastType";
import {jobList} from "../classes/store";

export class CalendarTemplates {
    static calendar(activePage: Signal<string>) {
        const noPastJobs = compute(jobs => jobs.filter(job => new Date(job.endTime).getTime() >= dayAsTime(0, 0)), jobList);
        const orderedJobs = compute(jobs => jobs.sort((a, b) => {
            const aTime = new Date(a.startTime).getTime();
            const bTime = new Date(b.startTime).getTime();
            return aTime - bTime;
        }), noPastJobs);
        const maxDaysFromNow = compute(jobs => {
            let max = 0;
            for (let job of jobs) {
                const endTime = new Date(job.endTime).getTime();
                const diff = (endTime - dayAsTime(0, 0)) / 1000 / 60 / 60 / 24;
                max = Math.max(max, diff);
            }
            return max;
        }, noPastJobs);
        const pixelsPerDay = 200;

        return create("div")
            .classes("flex-v", "flex-grow", "no-gap", "timeline-jobs-container")
            .children(
                CalendarTemplates.gridLines(maxDaysFromNow, pixelsPerDay, 2),
                CalendarTemplates.dates(maxDaysFromNow, pixelsPerDay),
                signalMap<Job>(orderedJobs, create("div").classes("timeline-jobs"), (job, i) => CalendarTemplates.job(job, orderedJobs, i, pixelsPerDay)),
            ).build();
    }

    static dates(maxDaysFromNow: Signal<number>, pixelsPerDay: number) {
        const container = create("div")
            .classes("timeline-dates")
            .build();
        const renderDates = (days: number, distance: number) => {
            const dates = Array.from({length: days}, (_, i) => {
                const date = new Date(dayAsTime(i, 0));
                return create("div")
                    .classes("timeline-date")
                    .styles("left", i * distance + "px")
                    .text(date.toLocaleDateString())
                    .build();
            });
            container.replaceChildren(...dates);
        }
        maxDaysFromNow.subscribe(days => {
            renderDates(days, pixelsPerDay);
        });

        if (maxDaysFromNow.value) {
            renderDates(maxDaysFromNow.value, pixelsPerDay);
        }

        return container;
    }

    static gridLines(maxDaysFromNow: Signal<number>, distance: number, subDivisions = 1) {
        const container = create("div")
            .classes("grid-lines")
            .build();
        const renderLines = (days: number, distance: number) => {
            const lines = Array.from({length: days * subDivisions}, (_, i) => {
                const isMain = i % subDivisions === 0;

                return create("div")
                    .classes("grid-line", isMain ? "main-grid-line" : "_")
                    .styles("left", (i * (distance / subDivisions)) + "px")
                    .build();
            });
            container.replaceChildren(...lines);
        }
        maxDaysFromNow.subscribe(days => {
            renderLines(days, distance);
        });
        if (maxDaysFromNow.value) {
            renderLines(maxDaysFromNow.value, distance);
        }

        return container;
    }

    static job(job: Job, jobs: Signal<Job[]>, index: number, pixelsPerDay: number) {
        const twelveHours = 12 * 60 * 60 * 1000;
        const localOffset = new Date().getTimezoneOffset() * 60 * 1000;
        const startTime = new Date(job.startTime).getTime();
        const endTime = new Date(job.endTime).getTime();
        const dayCount = job.dayCount;
        const jobNumber = job.jobNumber;
        const name = job.name;
        const customerId = job.customerId;
        const contact = job.contact;
        const disposition = job.disposition;
        const timeStatic = 1000 * 60 * 60 * 24;
        const leftOffset = Math.round((startTime + localOffset + twelveHours - dayAsTime()) / timeStatic * pixelsPerDay);
        const startMoved = leftOffset < 0;
        let width = Math.round((endTime - startTime) / timeStatic * pixelsPerDay);
        if (leftOffset < 0) {
            width += leftOffset;
        }
        const type = disposition ? "disposition" : "draft";
        const height = 40;
        const offset = 4;
        const availabilityErrors = AvailabilityCalculator.jobAvailabilityErrors(job, jobs.value);
        const errorCount = availabilityErrors.length;

        return create("div")
            .classes("timeline-job", "flex", type)
            .styles("left", Math.max(0, leftOffset) + "px")
            .styles("top", (index * (height + offset)) + 30 + "px")
            .styles("height", height + "px")
            .styles("width", width + "px")
            .children(
                create("div")
                    .classes("timeline-job-content", "flex")
                    .children(
                        create("div")
                            .classes("timeline-job-name")
                            .text(name)
                            .build(),
                        ifjs(startMoved, GenericTemplates.icon("arrow_right_alt")),
                        ifjs(errorCount > 0, GenericTemplates.errorIndicator(errorCount)),
                    ).build(),
                create("div")
                    .classes("timeline-job-details", "flex-v")
                    .children(
                        CalendarTemplates.jobWarnings(availabilityErrors),
                        CalendarTemplates.jobPrice(job),
                        CalendarTemplates.jobActions(job),
                        CalendarTemplates.jobProperties({
                            "Job number": {value: jobNumber, icon: "confirmation_number"},
                            "Day count": {value: dayCount, icon: "confirmation_number"},
                            "Start time": {value: new Date(startTime).toLocaleString(), icon: "calendar_today", valueWarning: getPastDateWarning(startTime)},
                            "End time": {value: new Date(endTime).toLocaleString(), icon: "calendar_today"},
                            "Customer": {value: customerId, icon: "account_circle"},
                            "Contact": {value: contact, icon: "contact_phone"},
                        }),
                    ).build(),
            ).build();
    }

    static jobPrice(job: Job) {
        const jobAssets = job.assets.concat(job.sets.map(set => set.assets).flat());
        const assetsDayRate = jobAssets.reduce((sum, asset) => sum + DayRateCalculator.calculateDayRate(asset.dayRate, asset.priceInCents), 0);
        const price = assetsDayRate * job.dayCount;

        return GenericTemplates.priceDisplay(signal(price), "Price for job", ["no-gap"]);
    }

    static jobProperties(object: any) {
        const keys = Object.keys(object);
        return create("div")
            .classes("flex-v", "job-property-list")
            .children(
                keys.map(key => {
                    let value = object[key].value;
                    if (value.constructor === Array) {
                        value = value.length + " items";
                    } else if (value.constructor === Object) {
                        value = value.length + " properties";
                    } else if (value.constructor === String) {
                        if (value === "") {
                            value = "-";
                        }
                    }
                    const icon = object[key].icon;

                    return create("div")
                        .classes("flex-v", "job-property", "small-gap", object[key].valueWarning ? "warning" : "_")
                        .title(object[key].valueWarning ?? "")
                        .children(
                            create("div")
                                .classes("flex", "job-property-label")
                                .children(
                                    ifjs(icon, GenericTemplates.icon(icon)),
                                    create("span")
                                        .text(key)
                                        .build(),
                                ).build(),
                            create("div")
                                .classes("flex")
                                .children(
                                    create("span")
                                        .classes("job-property-value")
                                        .text(value)
                                        .build(),
                                    ifjs(object[key].valueWarning, GenericTemplates.icon("warning", ["warning"])),
                                ).build()
                        ).build();
                })
            ).build();
    }

    static jobActions(job: Job) {
        return create("div")
            .classes("flex-v", "job-actions")
            .children(
                GenericTemplates.inlineToggle("Disposition", !!job.disposition, val => {
                    Api.updateJob(job.id, {
                        ...job,
                        disposition: val ? 1 : 0,
                    }).then(() => {
                        Api.getJobs().then(jobsResponse => {
                            if (jobsResponse.success) {
                                toast(`Job ${job.jobNumber} updated`, null, ToastType.positive);
                                jobList.value = jobsResponse.data as Job[];
                            } else {
                                toast(jobsResponse.data as string, null, ToastType.negative);
                            }
                        });
                    });
                }),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        JobTemplates.jobEditButton(job),
                        JobTemplates.jobDeleteButton(job),
                    ).build(),
            ).build();
    }

    static jobWarnings(availabilityErrors: any[]) {
        return create("div")
            .classes("flex-v", "full-width")
            .children(
                availabilityErrors.map(error => {
                    return create("div")
                        .classes("flex", "calendar-warning")
                        .text(`Asset ${error.asset.manufacturer} ${error.asset.model} is overbooked on ${error.date.toLocaleDateString()}`)
                        .build();
                }),
            ).build();
    }
}
