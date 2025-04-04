import {createModal, toast} from "./ui";
import {AssetTemplates} from "../templates/asset.templates";
import {Api} from "./api";
import {ToastType} from "../enums/ToastType";
import {assetList, jobList, setList} from "./store";
import {Asset} from "../../models/Asset";
import {SetTemplates} from "../templates/set.templates";
import {AssetSet} from "../../models/AssetSet";
import {JobTemplates} from "../templates/job.templates";
import {Job} from "../../models/Job";
import {GenericTemplates} from "../templates/generic.templates";
import {create} from "../lib/fjsc/src/f2";
import {ApiResponse} from "./api.base";
import {Signal} from "../lib/fjsc/src/signals";

export function newAsset() {
    createModal(AssetTemplates.assetForm({}, "New asset", (data, done) => {
        Api.createAsset(data).then(() => {
            Api.getAssets().then(assetsResponse => {
                if (assetsResponse.success) {
                    toast(`Asset ${data.manufacturer}/${data.model} created`, null, ToastType.positive);
                    assetList.value = assetsResponse.data as Asset[];
                }
                done();
            });
        });
    }));
}

export function deleteAsset(asset: Partial<Asset>) {
    createModal(GenericTemplates.confirmModalWithContent("Delete asset", create("div")
        .classes("flex-v")
        .children(
            create("p")
                .text(`Are you sure you want to delete the following asset?`)
                .build(),
            GenericTemplates.propertyList(asset)
        ).build(), "Yes", "No", () => {
        Api.deleteAssetByIdOrUniqueString(asset.id).then(() => {
            toast(`Asset ${asset.manufacturer}/${asset.model} deleted`, null, ToastType.positive);
            assetList.value = assetList.value.filter(a => a.id !== asset.id);
        });
    }));
}

export function newSet(set: Partial<AssetSet> = {}) {
    createModal(SetTemplates.setForm(set, "New set", (data, done) => {
        Api.createSet(data).then(() => {
            Api.getSets().then(setsResponse => {
                if (setsResponse.success) {
                    toast(`Set ${data.setName} created`, null, ToastType.positive);
                    setList.value = setsResponse.data as AssetSet[];
                }
                done();
            });
        });
    }));
}

export function deleteSet(set: Partial<AssetSet>) {
    createModal(GenericTemplates.confirmModalWithContent("Delete set", create("div")
        .classes("flex-v")
        .children(
            create("p")
                .text(`Are you sure you want to delete the following set?`)
                .build(),
            GenericTemplates.propertyList(set)
        ).build(), "Yes", "No", () => {
        Api.deleteSetById(set.id).then(() => {
            toast(`Set ${set.setName} deleted`, null, ToastType.positive);
            setList.value = setList.value.filter(s => s.id !== set.id);
        });
    }));
}

export function newJob() {
    createModal(JobTemplates.jobForm({}, "New job", (data, done) => {
        Api.createJob(data).then(() => {
            Api.getJobs().then(jobsResponse => {
                if (jobsResponse.success) {
                    toast(`Job ${data.jobNumber} added`, null, ToastType.positive);
                    jobList.value = jobsResponse.data as Job[];
                }
                done();
            });
        });
    }));
}

export function focusSearch() {
    const searchInput = document.querySelector("input[type=text][name=search]") as HTMLInputElement;
    if (searchInput) {
        searchInput.focus();
    }
}

export function getUpdateAssetMethod(asset: Asset, selectedAssetId: Signal<string> = null) {
    return (data: Partial<Asset>, done: () => void) => {
        Api.updateAsset(asset.id, data).then(() => {
            Api.getAssets().then((assetsResponse: ApiResponse<Asset[] | string>) => {
                if (assetsResponse.success) {
                    toast(`Asset ${data.manufacturer}/${data.model} updated`, null, ToastType.positive);
                    assetList.value = assetsResponse.data as Asset[];
                    if (selectedAssetId) {
                        selectedAssetId.value = asset.id;
                    }
                }
                done();
            });
        });
    };
}

export function editAsset(asset: Asset) {
    createModal(AssetTemplates.assetForm(asset, "Edit asset", getUpdateAssetMethod(asset)));
}

export function getUpdateSetMethod(set: AssetSet, selectedSetId: Signal<string> = null) {
    return (data: Partial<AssetSet>, done: () => void) => {
        Api.updateSet(set.id, data).then(() => {
            Api.getSets().then(setsResponse => {
                if (setsResponse.success) {
                    toast(`Set ${data.setName} updated`, null, ToastType.positive);
                    setList.value = setsResponse.data as AssetSet[];
                    if (selectedSetId) {
                        selectedSetId.value = set.id;
                    }
                }
                done();
            });
        });
    }
}

export function editSet(set: AssetSet) {
    createModal(SetTemplates.setForm(set, "Edit set", getUpdateSetMethod(set)));
}

export function editJob(job: Job) {
    createModal(JobTemplates.jobForm(job, "Edit job", getUpdateJobMethod(job)));
}

export function getUpdateJobMethod(job: Job, selectedJobId?: Signal<string>) {
    return (data: Partial<Job>, done: () => void = () => {}) => {
        Api.updateJob(job.id, data).then(() => {
            Api.getJobs().then(jobsResponse => {
                if (jobsResponse.success) {
                    toast(`Job ${data.jobNumber} updated`, null, ToastType.positive);
                    jobList.value = jobsResponse.data as Job[];
                    if (selectedJobId) {
                        selectedJobId.value = job.id;
                    }
                }
                done();
            });
        });
    };
}

export function deleteJob(job: Partial<Job>) {
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
}