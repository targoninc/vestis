import {date, day, dayAsTime, getPastDateWarning} from "../classes/time";
import {GenericTemplates} from "./generic.templates";
import {Api} from "../classes/api";
import {toast} from "../classes/ui";
import {JobTemplates} from "./job.templates";
import {DayRateCalculator} from "../classes/dayRateCalculator";
import {compute, signal, Signal} from "../lib/fjsc/src/signals";
import {Job} from "../../models/Job";
import {create, ifjs, signalMap} from "../lib/fjsc/src/f2";
import {ToastType} from "../enums/ToastType";
import {jobList} from "../classes/store";
import {compareJobsByStartTime, getDayOffset, getMaxDaysFromJobs} from "../classes/jobUtils";

export class CalendarTemplates {
    static calendar(activePage: Signal<string>) {
        const dayOffset = signal(0);
        const noPastJobs = compute((jobs, offset) => jobs.filter(job => new Date(job.endTime).getTime() >= dayAsTime(offset, 0)), jobList, dayOffset);
        const orderedJobs = compute(jobs => jobs.sort(compareJobsByStartTime), noPastJobs);
        const maxDaysFromNow = compute(getMaxDaysFromJobs, noPastJobs);
        const pixelsPerDay = 200;
        activePage.subscribe(page => {
            if (page === "jobs" || page === "calendar") {
                Api.getJobs().then(jobsResponse => {
                    if (jobsResponse.success) {
                        jobList.value = jobsResponse.data as Job[];
                    }
                });
            }
        });

        return create("div")
            .classes("flex-v", "flex-grow")
            .children(
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.buttonWithIcon("today", "Today", () => {
                            dayOffset.value = 0;
                        }),
                        GenericTemplates.buttonWithIcon("chevron_left", "Previous week", () => {
                            dayOffset.value = dayOffset.value - 7;
                        }),
                        GenericTemplates.buttonWithIcon("chevron_right", "Next week", () => {
                            dayOffset.value = dayOffset.value + 7;
                        }),
                        GenericTemplates.buttonWithIcon("chevron_left", "Previous day", () => {
                            dayOffset.value = dayOffset.value - 1;
                        }),
                        GenericTemplates.buttonWithIcon("chevron_right", "Next day", () => {
                            dayOffset.value = dayOffset.value + 1;
                        }),
                    ).build(),
                create("div")
                    .classes("flex", "flex-grow")
                    .children(
                        create("div")
                            .classes("flex-v")
                            .children(
                                CalendarTemplates.dateOverview(dayOffset),
                                signalMap(orderedJobs, create("div").classes("flex-v"), job => {
                                    return create("div")
                                        .classes("card", "clickable", "flex")
                                        .onclick(() => {
                                            dayOffset.value = getDayOffset(job.startTime);
                                        })
                                        .children(
                                            GenericTemplates.icon("calendar_today"),
                                            create("span")
                                                .text(job.name)
                                                .build(),
                                        ).build();
                                }),
                            ).build(),
                        create("div")
                            .classes("flex", "flex-grow", "no-gap", "timeline-jobs-container")
                            .children(
                                CalendarTemplates.gridLines(maxDaysFromNow, pixelsPerDay, 2),
                                CalendarTemplates.dates(dayOffset, maxDaysFromNow, pixelsPerDay),
                                signalMap<Job>(orderedJobs, create("div").classes("timeline-jobs"), (job, i) => CalendarTemplates.job(job, dayOffset, i, pixelsPerDay)),
                            ).build()
                    ).build()
            ).build();
    }

    static dateOverview(dayOffset: Signal<number>) {
        const rows = 5;
        const cols = 7;
        const today = date();
        const weekday = today.getDay();
        const getOffset = (i: number, j: number) => {
            const offset = Math.floor(rows / 2) * cols;
            return (i * 7 + j) - offset - weekday;
        }

        return create("div")
            .children(
                ...Array.from({length: rows}, (_, i) => {
                    return create("div")
                        .classes("flex", "align-center", "date-overview-row")
                        .children(
                            ...Array.from({length: cols}, (_, j) => {
                                const offset = getOffset(i, cols - j);
                                const curDay = date(offset, 0);
                                const onlyDay = curDay.getDate();
                                const isToday = day(0, 0) === day(offset, 0);
                                const activeClass = compute(o => o === offset ? "active" : "_", dayOffset);

                                return create("div")
                                    .classes("date-overview-day", isToday ? "today" : "_", activeClass)
                                    .onclick(() => {
                                        dayOffset.value = offset;
                                    })
                                    .text(onlyDay)
                                    .build();
                            }).reverse()
                        ).build();
                }),
            ).build();
    }

    static dates(dayOffset: Signal<number>, maxDaysFromNow: Signal<number>, pixelsPerDay: number) {
        const container = create("div")
            .classes("timeline-dates")
            .build();
        const renderDates = () => {
            const offset = dayOffset.value;
            const days = maxDaysFromNow.value;
            const dates = Array.from({length: days}, (_, i) => {
                const date = new Date(dayAsTime(i + offset, 0));
                return create("div")
                    .classes("timeline-date")
                    .styles("left", i * pixelsPerDay + "px")
                    .text(date.toLocaleDateString())
                    .build();
            });
            container.replaceChildren(...dates);
        }
        maxDaysFromNow.subscribe(renderDates);
        dayOffset.subscribe(renderDates);

        if (maxDaysFromNow.value) {
            renderDates();
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

    static job(job: Job, dayOffset: Signal<number>, index: number, pixelsPerDay: number) {
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
        const leftOffsetNumeric = compute(offset => Math.round((startTime + localOffset + twelveHours - dayAsTime(offset)) / timeStatic * pixelsPerDay), dayOffset);
        const startMoved = compute(lon => lon < 0, leftOffsetNumeric);
        const width = compute(lon => {
            let widthTmp = Math.round((endTime - startTime) / timeStatic * pixelsPerDay);
            if (lon < 0) {
                widthTmp += lon;
            }
            return widthTmp + "px";
        }, leftOffsetNumeric);

        const type = disposition ? "disposition" : "draft";
        const height = 40;
        const offset = 4;

        return create("div")
            .classes("timeline-job", "flex", type)
            .styles("left", compute(lon => Math.max(0, lon) + "px", leftOffsetNumeric))
            .styles("top", (index * (height + offset)) + 30 + "px")
            .styles("height", height + "px")
            .styles("width", width)
            .children(
                create("div")
                    .classes("timeline-job-content", "flex")
                    .children(
                        create("div")
                            .classes("timeline-job-name")
                            .text(name)
                            .build(),
                        ifjs(startMoved, GenericTemplates.icon("arrow_right_alt")),
                    ).build(),
                create("div")
                    .classes("timeline-job-details", "flex-v")
                    .children(
                        CalendarTemplates.jobPrice(job),
                        CalendarTemplates.jobActions(job),
                        CalendarTemplates.jobProperties({
                            "Job number": {value: jobNumber, icon: "confirmation_number"},
                            "Day count": {value: dayCount, icon: "confirmation_number"},
                        }),
                        CalendarTemplates.jobProperties({
                            "Start time": {value: new Date(startTime).toLocaleString(), icon: "calendar_today", valueWarning: getPastDateWarning(startTime)},
                            "End time": {value: new Date(endTime).toLocaleString(), icon: "calendar_today"},
                        }),
                        CalendarTemplates.jobProperties({
                            "Customer": {value: customerId, icon: "account_circle"},
                            "Contact": {value: contact, icon: "contact_phone"},
                        }),
                    ).build(),
            ).build();
    }

    static jobPrice(job: Job) {
        const jobAssets = job.assets.concat(job.sets.map(set => set.assets).flat());
        const assetsDayRate = jobAssets.reduce((sum, asset) => sum + DayRateCalculator.calculateDayRate(asset.dayRate, asset.dayRateFactor, asset.priceInCents), 0);
        const price = assetsDayRate * job.dayCount;

        return GenericTemplates.priceDisplay(signal(price), "Price for job", ["no-gap"]);
    }

    static jobProperties(object: any) {
        const keys = Object.keys(object);
        return create("div")
            .classes("flex", "job-property-list")
            .children(
            ...keys.map(key => {
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
            ...availabilityErrors.map(error => {
                    return create("div")
                        .classes("flex", "calendar-warning")
                        .text(`Asset ${error.asset.manufacturer} ${error.asset.model} is overbooked on ${error.date.toLocaleDateString()}`)
                        .build();
                }),
            ).build();
    }
}
