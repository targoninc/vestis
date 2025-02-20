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

export function newSet() {
    createModal(SetTemplates.setForm({}, "New set", (data, done) => {
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
