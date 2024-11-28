import {Api} from "./api";
import {signal} from "../lib/fjsc/src/signals";
import {Asset} from "../../models/Asset";
import {AssetSet} from "../../models/AssetSet";
import {Tag} from "../../models/Tag";
import {Job} from "../../models/Job";

export const activePage = signal<string>("calendar");
export const assetList = signal<Asset[]>([]);
export const setList = signal<AssetSet[]>([]);
export const tagList = signal<Tag[]>([]);
export const jobList = signal<Job[]>([]);
export const currentCheckout = signal({
    assets: [],
    sets: []
});
export const scannerBuffer = signal<string>("");

export function initializeStore() {
    Api.getAssets().then(assetsResponse => {
        if (assetsResponse.success) {
            assetList.value = assetsResponse.data as Asset[];
        }
    });
    Api.getSets().then(setsResponse => {
        if (setsResponse.success) {
            setList.value = setsResponse.data as AssetSet[];
        }
    });
    Api.getTags().then(tagsResponse => {
        if (tagsResponse.success) {
            tagList.value = tagsResponse.data as Tag[];
        }
    });
    Api.getJobs().then(jobsResponse => {
        if (jobsResponse.success) {
            jobList.value = jobsResponse.data as Job[];
        }
    });
}