import {GenericTemplates} from "./generic.templates";
import {day} from "../classes/time";
import {closeModal, createModal, toast} from "../classes/ui";
import {Api} from "../classes/api";
import {AssetTemplates} from "./asset.templates";
import {SetTemplates} from "./set.templates";
import {AvailabilityCalculator, itemsFromAssetsAndSets} from "../classes/availabilityCalculator";
import {compute, Signal, signal} from "../lib/fjsc/src/signals";
import {Job} from "../../models/Job";
import {create, ifjs, signalMap, StringOrSignal} from "../lib/fjsc/src/f2";
import {ToastType} from "../enums/ToastType";
import {Callback} from "../classes/types";
import {assetList, jobList, setList} from "../classes/store";
import {searchList} from "../classes/search";
import {Tab} from "../../models/uiExtensions/Tab";
import {editAsset, editSet, newJob} from "../classes/actions";
import {JobItem} from "../../models/JobItem";
import {Asset} from "../../models/Asset";
import {typeIcons} from "../enums/TypeIcons";

export class JobTemplates {
    static jobForm(jobData: Partial<Job>, title: StringOrSignal, onSubmit: Callback<[Job, any]> = (data, done) => {}, isModal = true) {
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
        const loading = signal(false);
        const submitClass = signal("disabled");
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
            const availabilityErrors = AvailabilityCalculator.jobAvailabilityErrors(job, jobList.value);
            if (availabilityErrors.length > 0) {
                warnings.value = availabilityErrors.map(error => `Asset ${error.asset.manufacturer} ${error.asset.model} is overbooked on ${error.date.toLocaleDateString()}`);
            }
        };
        data.subscribe(validateData);
        const validate = () => {
            if (loading.value || invalid.value) {
                submitClass.value = "disabled";
            } else {
                submitClass.value = "_";
            }
        };
        invalid.subscribe(validate);
        loading.subscribe(validate);
        validate();
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
                        GenericTemplates.buttonWithIcon("save", "Save", () => {
                            loading.value = true;
                            onSubmit(data.value, () => {
                                loading.value = false;
                                if (isModal) {
                                    closeModal();
                                }
                            });
                        }, ["positive", submitClass]),
                        ifjs(jobData && jobData.id, JobTemplates.jobDeleteButton(jobData)),
                        ifjs(loading, GenericTemplates.spinner()),
                    ).build()
            ).build();
    }

    static assetsTab(data: Signal<Job>) {
        const assets = compute(jobData => jobData.assets, data);
        const availableAssets = compute((assets, allAssets) => {
            return allAssets.filter(asset => {
                return !assets.some(a => a.id === asset.id);
            });
        }, assets, assetList);

        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .text("Assets")
                    .build(),
                GenericTemplates.buttonWithIcon("add", "Add asset", () => {
                    createModal(AssetTemplates.assetSearch(availableAssets, newAsset => {
                        data.value = {
                            ...data.value,
                            assets: [
                                ...data.value.assets,
                                newAsset,
                            ],
                        };
                        closeModal(true);
                    }));
                }, ["positive"]),
                AssetTemplates.assetListWithQuantity(assets, removeAsset => {
                    data.value = {
                        ...data.value,
                        assets: data.value.assets.filter(a => a.id !== removeAsset.id),
                    }
                }, (id, newQuantity) => {
                    data.value = {
                        ...data.value,
                        assets: data.value.assets.map(a => {
                            if (a.id === id) {
                                return {
                                    ...a,
                                    quantity: newQuantity,
                                };
                            }
                            return a;
                        }),
                    };
                }),
            ).build();
    }

    static itemsTab(data: Signal<Job>) {
        const assets = compute(jobData => jobData.assets, data);
        const sets = compute(jobData => jobData.sets, data);
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

        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .text("Items")
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.buttonWithIcon("add", "Add item", () => {
                            createModal(JobTemplates.itemSearch(availableItems, (newItem: JobItem) => {
                                if (newItem.type === "asset") {
                                    data.value = {
                                        ...data.value,
                                        assets: [
                                            ...data.value.assets,
                                            newItem.asset,
                                        ],
                                    };
                                } else {
                                    data.value = {
                                        ...data.value,
                                        sets: [
                                            ...data.value.sets,
                                            newItem.set
                                        ],
                                    };
                                }
                                closeModal(true);
                            }));
                        }, ["positive"]),
                    ).build(),
                JobTemplates.itemList(items, removeItem => {
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
                }, (id: string, newQuantity: number) => {
                    data.value = {
                        ...data.value,
                        assets: data.value.assets.map(a => {
                            if (a.id === id) {
                                return {
                                    ...a,
                                    quantity: newQuantity,
                                };
                            }
                            return a;
                        }),
                        sets: data.value.sets.map(s => {
                            if (s.id === id) {
                                return {
                                    ...s,
                                    quantity: newQuantity,
                                };
                            }
                            return s;
                        }),
                    };
                }),
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
                        GenericTemplates.input<string>("text", "jobNumber", jobNumber, "Job number", "Job number", "jobNumber", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                jobNumber: newValue,
                            };
                        }),
                        GenericTemplates.input<string>("text", "name", name, "Name", "Name", "name", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                name: newValue,
                            };
                        }, [], true),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<string>("text", "customerId", customerId, "Customer", "Customer", "customerId", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                customerId: newValue,
                            };
                        }),
                        GenericTemplates.input<string>("text", "contact", contact, "Contact", "Contact", "contact", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                contact: newValue,
                            };
                        }),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<number>("datetime-local", "startTime", startTime, "Start time", "Start time", "startTime", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                startTime: newValue,
                            };
                        }, ["step", "1800"]),
                        GenericTemplates.input<number>("datetime-local", "endTime", endTime, "End time", "End time", "endTime", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                endTime: newValue,
                            };
                        }),
                        GenericTemplates.input<number>("number", "dayCount", dayCount, "Day count", "Day count", "dayCount", [], (newValue) => {
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
            createModal(JobTemplates.jobForm(job, "Edit job", (data, done) => {
                Api.updateJob(job.id, data).then(() => {
                    Api.getJobs().then(jobsResponse => {
                        if (jobsResponse.success) {
                            toast(`Job ${data.jobNumber} updated`, null, ToastType.positive);
                            jobList.value = jobsResponse.data as Job[];
                        }
                        done();
                    });
                });
            }));
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
                        GenericTemplates.input("text", "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
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

    static setsTab(data: Signal<Job>) {
        const sets = compute(jobData => jobData.sets, data);
        const availableSets = compute((sets, allSets) => {
            return allSets.filter(set => {
                return !sets.some(s => s.id === set.id);
            });
        }, sets, setList);

        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .text("Sets")
                    .build(),
                GenericTemplates.buttonWithIcon("add", "Add set", () => {
                    createModal(SetTemplates.setSearch(availableSets, newSet => {
                        data.value = {
                            ...data.value,
                            sets: [
                                ...data.value.sets,
                                newSet,
                            ],
                        };
                        closeModal(true);
                    }));
                }, ["positive"]),
                SetTemplates.setListWithQuantity(sets, removeSet => {
                    data.value = {
                        ...data.value,
                        sets: data.value.sets.filter(s => s.id !== removeSet.id),
                    }
                }, (id, newQuantity) => {
                    data.value = {
                        ...data.value,
                        sets: data.value.sets.map(s => {
                            if (s.id === id) {
                                return {
                                    ...s,
                                    quantity: newQuantity,
                                };
                            }
                            return s;
                        }),
                    };
                }),
            ).build();
    }

    static jobDeleteButton(job: Partial<Job>) {
        return GenericTemplates.buttonWithIcon("delete", "Delete", () => {
            createModal(GenericTemplates.confirmModalWithContent("Delete job", create("div")
                .classes("flex-v")
                .children(
                    create("p")
                        .text(`Are you sure you want to delete the following job?`)
                        .build(),
                    GenericTemplates.propertyList(job)
                ).build(), "Yes", "No", () => {
                Api.deleteJobById(job.id).then(() => {
                    toast(`Job ${job.jobNumber} deleted`, null, ToastType.positive);
                    jobList.value = jobList.value.filter(j => j.id !== job.id);
                });
            }));
        }, ["negative"]);
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
        const form = compute(job => {
            return JobTemplates.jobForm(job, "Edit job", (data, done) => {
                Api.updateJob(job.id, data).then(() => {
                    Api.getJobs().then(jobsResponse => {
                        if (jobsResponse.success) {
                            toast(`Job ${data.jobNumber} updated`, null, ToastType.positive);
                            jobList.value = jobsResponse.data as Job[];
                            selectedJobId.value = job.id;
                        }
                        done();
                    });
                });
            }, false);
        }, selectedJob);

        return create("div")
            .classes("flex-v", "bordered-panel", "flex-grow")
            .children(form)
            .build();
    }

    private static itemList(items: Signal<JobItem[]>, onRemoveItem: (removeItem: JobItem) => void, onChangeQuantity: (id: string, newQuantity: number) => void) {
        return create("div")
            .classes("flex-v")
            .children(
                signalMap(items, create("div").classes("flex-v"), item => JobTemplates.item(item, onRemoveItem, onChangeQuantity)),
            ).build();
    }


    private static item(item: JobItem, onRemoveItem: (removeItem: JobItem) => void, onChangeQuantity: (id: string, newQuantity: number) => void) {
        const hasContent = item.content != undefined && item.content.length > 0;

        return create("div")
            .classes("flex", "space-between", "card", "clickable", ...(hasContent ? ["job-item"] : []))
            .onclick(() => {
                switch (item.type) {
                    case "asset":
                        editAsset(item.asset);
                        break;
                    case "set":
                        editSet(item.set);
                        break;
                }
            })
            .children(
                create("span")
                    .text(item.name)
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.quantityChanger(item.id, item.asset?.isUnique ?? false, item.quantity, item.maxQuantity, onChangeQuantity),
                        GenericTemplates.buttonWithIcon("delete", "Remove", () => {
                            onRemoveItem(item);
                        }, ["negative"]),
                    ).build()
            ).build();
    }

    private static itemSearch(availableItems: Signal<JobItem[]>, onAdd: (newItem: JobItem) => void) {
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
                create("span")
                    .text("Items")
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input("text", "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
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
                        signalMap<JobItem>(filteredItems, create("tbody"), item => {
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