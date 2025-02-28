import {GenericTemplates} from "./generic.templates";
import {day} from "../classes/time";
import {closeModal, createModal} from "../classes/ui";
import {itemFromAsset, itemsFromAssetsAndSets} from "../classes/availabilityCalculator";
import {compute, Signal, signal} from "../lib/fjsc/src/signals";
import {Job} from "../../models/Job";
import {create, ifjs, signalMap, StringOrSignal} from "../lib/fjsc/src/f2";
import {Callback} from "../classes/types";
import {assetList, jobList, setList} from "../classes/store";
import {searchList} from "../classes/search";
import {Tab} from "../../models/uiExtensions/Tab";
import {deleteJob, getUpdateJobMethod, newJob} from "../classes/actions";
import {Item} from "../../models/Item";
import {typeIcons} from "../enums/TypeIcons";
import {InputType} from "../lib/fjsc/src/Types";
import {getJobPdf} from "../../pdf/jobPdfs";
import {openBlob} from "../../pdf/helpers";
import {Asset} from "../../models/Asset";
import {AssetSet} from "../../models/AssetSet";

export class JobTemplates {
    static jobForm(jobData: Partial<Job>, title: StringOrSignal, onSubmit: Callback<[Job, any]> = () => {
    }, isModal = true) {
        const maxJobNumber = jobList.value.reduce((max: number, job) => Math.max(max, parseInt(job.jobNumber)), 0);
        const data = signal<Job>({
            jobNumber: (maxJobNumber + 1).toString(),
            name: "",
            customerId: "",
            contact: "",
            startTime: new Date(day()).getTime(),
            endTime: new Date(day(2)).getTime(),
            dayCount: 1,
            disposition: 0,
            assets: [],
            sets: [],
            id: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            ...jobData,
        });
        const initialData = data.value;
        const notSaved = compute(d => JSON.stringify(d) !== JSON.stringify(initialData), data);
        const loading = signal(false);
        const invalid = signal(false);
        const errors = signal([]);
        const warnings = signal([]);
        const validateData = (job: Job) => {
            const tmpErrors = [];
            const startTime = new Date(job.startTime).getTime();
            const endTime = new Date(job.endTime).getTime();
            if (startTime > endTime) {
                tmpErrors.push("End time must be after start time");
            }
            if (job.dayCount < 1) {
                tmpErrors.push("Day count must be at least 1");
            }
            if (!job.jobNumber) {
                tmpErrors.push("Job number is required");
            }
            if (!job.name || job.name === "") {
                tmpErrors.push("Job name is required");
            }
            if (tmpErrors.length > 0) {
                invalid.value = true;
                errors.value = tmpErrors;
            } else {
                invalid.value = false;
                errors.value = [];
            }
        };
        data.subscribe(validateData);
        const notSaveable = compute((l, i) => l || i, loading, invalid);
        validateData(data.value);
        const tabs = [
            JobTemplates.jobInfoTab(data),
            JobTemplates.itemsTab(data),
        ];
        const tabDefinitions = signal<Tab[]>([
            {
                name: "Info",
                icon: "info",
                id: "info",
            },
            {
                name: "Items",
                icon: "toc",
                id: "items",
            }
        ]);
        const activeTab = signal(tabDefinitions.value[0].id);
        const isUpdate = !!(jobData && jobData.id);

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(title)
                    .build(),
                JobTemplates.jobTypeIndicator(data),
                GenericTemplates.tabs(tabs, tabDefinitions, activeTab),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        signalMap(errors, create("div").classes("flex-v"), GenericTemplates.error),
                        signalMap(warnings, create("div").classes("flex-v"), GenericTemplates.warning),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        ifjs(isUpdate, JobTemplates.jobDeleteButton(jobData)),
                        GenericTemplates.notSaved(isUpdate, notSaved, notSaveable, () => {
                            data.value = initialData;
                        }, () => {
                            loading.value = true;
                            onSubmit(data.value, () => {
                                loading.value = false;
                                if (isModal) {
                                    closeModal();
                                }
                            });
                        }),
                        ifjs(loading, GenericTemplates.spinner()),
                    ).build(),
                ifjs(isUpdate, create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.copyButton("Copy ID", jobData?.id),
                        GenericTemplates.buttonWithIcon("print", "Generate delivery note", async () => {
                            const blob = await getJobPdf(jobData as Job);
                            openBlob(blob);
                        })
                    ).build())
            ).build();
    }

    static itemsTab(data: Signal<Job>) {
        const assets = compute(jobData => jobData.assets, data);
        const sets = compute(jobData => jobData.sets, data);
        const id = compute(jobData => jobData.id, data);
        const items = compute((a, s) => itemsFromAssetsAndSets(a, s, data.value.id), assets, sets);

        const availableItems = compute((j, i, a, s) => {
            return itemsFromAssetsAndSets(a, s, j.id).filter(item => {
                const isInJob = i.some(i => i.id === item.id);
                if (isInJob) {
                    return false;
                }

                return item.maxQuantity > 0;
            });
        }, data, items, assetList, setList);

        function updateProperty(id: string, property: keyof (Asset|AssetSet), value: any) {
            data.value = {
                ...data.value,
                assets: data.value.assets.map(a => {
                    if (a.id === id) {
                        return {
                            ...a,
                            [property]: value,
                        };
                    }
                    return a;
                }),
                sets: data.value.sets.map(s => {
                    if (s.id === id) {
                        return {
                            ...s,
                            [property]: value,
                        };
                    }
                    return s;
                }),
            };
        }

        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .text("Items")
                    .build(),
                JobTemplates.itemList(items, data, availableItems, id, removeItem => {
                        if (removeItem.type === "asset") {
                            data.value = {
                                ...data.value,
                                assets: data.value.assets.filter(a => a.id !== removeItem.id),
                            };
                        } else {
                            data.value = {
                                ...data.value,
                                sets: data.value.sets.filter(s => s.id !== removeItem.id),
                            };
                        }
                    }, updateProperty)
            ).build();
    }

    static jobInfoTab(data: Signal<Job>) {
        const jobNumber = compute(jobData => jobData.jobNumber, data);
        const name = compute(jobData => jobData.name, data);
        const customerId = compute(jobData => jobData.customerId, data);
        const contact = compute(jobData => jobData.contact, data);
        const startTime = compute(jobData => jobData.startTime, data);
        const endTime = compute(jobData => jobData.endTime, data);
        const dayCount = compute(jobData => jobData.dayCount, data);
        const disposition = compute(jobData => jobData.disposition, data);

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<string>(InputType.text, "jobNumber", jobNumber, "Job number", "Job number", "jobNumber", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                jobNumber: newValue,
                            };
                        }),
                        GenericTemplates.input<string>(InputType.text, "name", name, "Name", "Name", "name", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                name: newValue,
                            };
                        }, [], true),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<string>(InputType.text, "customerId", customerId, "Customer", "Customer", "customerId", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                customerId: newValue,
                            };
                        }),
                        GenericTemplates.input<string>(InputType.text, "contact", contact, "Contact", "Contact", "contact", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                contact: newValue,
                            };
                        }),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<number>(InputType.datetimelocal, "startTime", startTime, "Start time", "Start time", "startTime", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                startTime: newValue,
                            };
                        }, ["step", "1800"]),
                        GenericTemplates.input<number>(InputType.datetimelocal, "endTime", endTime, "End time", "End time", "endTime", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                endTime: newValue,
                            };
                        }),
                        GenericTemplates.input<number>(InputType.number, "dayCount", dayCount, "Day count", "Day count", "dayCount", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                dayCount: newValue,
                            };
                        }),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.toggle("Disposition", disposition, (newValue) => {
                            data.value = {
                                ...data.value,
                                disposition: newValue ? 1 : 0,
                            };
                        }),
                    ).build(),
            ).build();
    }

    static jobEditButton(job: Job) {
        return GenericTemplates.buttonWithIcon("edit", "Edit", () => {
            createModal(JobTemplates.jobForm(job, "Edit job", getUpdateJobMethod(job)));
        });
    }

    static jobList(jobList: Signal<Job[]>, selectedJobId: Signal<string>) {
        const headers = [
            {
                headerName: "Job number",
                propertyName: "jobNumber",
            },
            {
                headerName: "Name",
                propertyName: "name",
            },
            {
                headerName: "Start time",
                propertyName: "startTime",
            },
            {
                headerName: "End time",
                propertyName: "endTime",
            },
            {
                headerName: "Day count",
                propertyName: "dayCount",
            },
        ];
        const activeSortHeader = signal(null);
        const search = signal("");
        const searchProperties = ["jobNumber", "contact", "name"];
        const filteredList = signal<Job[]>([]);
        const filterItems = () => {
            if (search.value === "") {
                filteredList.value = jobList.value;
                return;
            }
            const searchValue = search.value.toLowerCase();
            filteredList.value = searchList(searchProperties, jobList.value, searchValue);
        };
        search.subscribe(filterItems);
        jobList.subscribe(filterItems);
        filterItems();

        return create("div")
            .classes("flex-v", "flex-grow")
            .children(
                create("span")
                    .text("Jobs")
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input(InputType.text, "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
                        GenericTemplates.buttonWithIcon("add", "Add job", newJob, ["positive"], [], "N"),
                    ).build(),
                create("table")
                    .classes("full-width")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        ...headers.map(header => GenericTemplates.tableListHeader(header.headerName, header.propertyName, activeSortHeader, jobList))
                                    ).build(),
                            ).build(),
                        signalMap<Job>(jobList, create("tbody"), job => JobTemplates.job(job, selectedJobId))
                    ).build(),
            ).build();
    }

    static job(job: Job, selectedJobId: Signal<string>) {
        const activeClass = compute((id): string => id === job.id ? "active" : "_", selectedJobId);

        return create("tr")
            .classes("clickable", activeClass)
            .onclick(() => {
                selectedJobId.value = job.id;
            })
            .children(
                create("td")
                    .text(job.jobNumber)
                    .build(),
                create("td")
                    .text(job.name)
                    .build(),
                create("td")
                    .text(job.startTime)
                    .build(),
                create("td")
                    .text(job.endTime)
                    .build(),
                create("td")
                    .text(job.dayCount)
                    .build(),
            ).build();
    }

    static jobDeleteButton(job: Partial<Job>) {
        return GenericTemplates.buttonWithIcon("delete", "Delete", () => deleteJob(job), ["negative"]);
    }

    static jobTypeIndicator(data: Signal<Job>) {
        const type = compute(jobData => jobData.disposition ? "Disposition" : "Draft", data);
        const typeClass = compute(jobData => jobData.disposition ? "disposition" : "draft", data);

        return create("h2")
            .classes("job-type-indicator", typeClass)
            .text(type)
            .build();
    }

    static jobCard(selectedJob: Signal<Job>, selectedJobId: Signal<string>) {
        const form = compute(job => JobTemplates.jobForm(job, "Edit job", getUpdateJobMethod(job, selectedJobId), false), selectedJob);

        return create("div")
            .classes("flex-v", "bordered-panel", "flex-grow")
            .children(form)
            .build();
    }

    private static itemList(items: Signal<Item[]>, job: Signal<Job>, availableItems: Signal<Item[]>, jobId: Signal<string>,
                            onRemoveItem: (removeItem: Item) => void, onUpdateProperty: (id: string, property: string, value: any) => void) {
        const search = signal("");
        const filteredItems = signal([]);
        const filterList = () => {
            if (search.value === "") {
                filteredItems.value = items.value;
                return;
            }
            const searchValue = search.value.toLowerCase();
            filteredItems.value = searchList(["id", "name", "asset", "set"], items.value, searchValue);
        };
        search.subscribe(filterList);
        items.subscribe(filterList);
        filterList();

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input(InputType.text, "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
                        GenericTemplates.buttonWithIcon("add", "Add item", () => {
                            createModal(JobTemplates.itemSearch(availableItems, (newItem: Item) => {
                                if (newItem.type === "asset") {
                                    job.value = {
                                        ...job.value,
                                        assets: [
                                            ...job.value.assets,
                                            {
                                                ...newItem.entity,
                                                quantity: 1,
                                            },
                                        ],
                                    };
                                } else {
                                    job.value = {
                                        ...job.value,
                                        sets: [
                                            ...job.value.sets,
                                            {
                                                ...newItem.entity,
                                                quantity: 1,
                                            },
                                        ],
                                    };
                                }
                                closeModal(true);
                            }));
                        }, ["positive"]),
                    ).build(),
                signalMap(filteredItems, create("div").classes("flex-v"), item => JobTemplates.item(item, job.value, onRemoveItem, onUpdateProperty)),
            ).build();
    }


    private static item(item: Item, job: Job, onRemoveItem: (removeItem: Item) => void,
                        onUpdateProperty: (id: string, property: string, value: any) => void) {
        const hasContent = item.content != undefined && item.content.length > 0;
        const content = item.content ?? [];
        const expanded = signal(false);
        const icon = compute(expanded => expanded ? "expand_more" : "chevron_right", expanded);
        const contentClass = compute(expanded => expanded ? "expanded" : "_", expanded);
        const parentClass = compute(expanded => expanded ? "no-radius-bottom" : "_", expanded);
        const dayCount = item.dayCount ?? job.dayCount;

        return create("div")
            .classes("flex-v", "no-gap")
            .children(
                create("div")
                    .classes("flex", "space-between", "card", ...(hasContent ? ["job-item", parentClass] : []))
                    .children(
                        create("div")
                            .classes("flex", "align-center")
                            .children(
                                ifjs(hasContent, GenericTemplates.buttonWithIcon(icon, null, () => expanded.value = !expanded.value, ["round-button"])),
                                GenericTemplates.quantityChanger("x", item.id, true, item.quantity, item.maxQuantity,
                                    (id: string, newQuantity: number) => onUpdateProperty(id, "quantity", newQuantity)),
                                GenericTemplates.itemName(item),
                            ).build(),
                        create("div")
                            .classes("flex", "align-center")
                            .children(
                                ifjs(hasContent, GenericTemplates.buttonWithIcon("event_repeat", null, () => onUpdateProperty(item.id, "days", null))),
                                GenericTemplates.quantityChanger("d", item.id, true, dayCount, job.dayCount,
                                    (id: string, newDays: number) => onUpdateProperty(id, "days", newDays)),
                                GenericTemplates.buttonWithIcon("delete", "Remove", () => onRemoveItem(item), ["negative"]),
                            ).build()
                    ).build(),
                ifjs(hasContent, create("div")
                    .classes("expanded-content", "transition-height", contentClass)
                    .children(
                        create("div")
                            .classes("flex-v", "no-gap")
                            .children(
                                ...content.map((a, i) => {
                                    const isFirst = i === 0;
                                    const isLast = i === content.length - 1;

                                    return create("div")
                                        .classes("flex", "space-between", "secondary-card", isFirst ? "no-radius-top" : (isLast ? "no-radius-bottom" : "_"))
                                        .children(
                                            GenericTemplates.itemName(itemFromAsset(a, job.id)),
                                            GenericTemplates.quantityChanger("x", a.id, false, a.quantity * item.quantity, a.count),
                                        ).build();
                                })
                            ).build(),
                    ).build())
            ).build();
    }

    private static itemSearch(availableItems: Signal<Item[]>, onAdd: (newItem: Item) => void) {
        const search = signal("");
        const filteredItems = signal([]);
        const filterList = () => {
            if (search.value === "") {
                filteredItems.value = availableItems.value;
                return;
            }
            const searchValue = search.value.toLowerCase();
            filteredItems.value = searchList(["id", "name", "asset", "set"], availableItems.value, searchValue);
        };
        search.subscribe(filterList);
        availableItems.subscribe(filterList);
        filterList();

        return create("div")
            .classes("flex-v", "flex-grow", "search-panel")
            .children(
                create("div")
                    .classes("flex", "align-center", "search-header")
                    .children(
                        create("span")
                            .text("Items")
                            .build(),
                        create("div")
                            .classes("flex", "align-center")
                            .children(
                                GenericTemplates.input(InputType.text, "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
                            ).build(),
                    ).build(),
                create("table")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        create("th")
                                            .text("Type")
                                            .build(),
                                        create("th")
                                            .text("Name")
                                            .build(),
                                        create("th")
                                            .text("Stock")
                                            .build(),
                                    ).build(),
                            ).build(),
                        signalMap<Item>(filteredItems, create("tbody"), item => {
                            return create("tr")
                                .classes("clickable")
                                .onclick(() => {
                                    onAdd(item);
                                })
                                .children(
                                    create("td")
                                        .children(
                                            GenericTemplates.typeIndicator(item.type, typeIcons[item.type]),
                                        ).build(),
                                    create("td")
                                        .text(item.name)
                                        .build(),
                                    create("td")
                                        .text(item.maxQuantity)
                                        .build(),
                                ).build();
                        })
                    ).build(),
            ).build();
    }
}