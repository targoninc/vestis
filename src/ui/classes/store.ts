import {Api} from "./api";
import {compute, signal} from "../lib/fjsc/src/signals";
import {Asset} from "../../models/Asset";
import {AssetSet} from "../../models/AssetSet";
import {Tag} from "../../models/Tag";
import {Job} from "../../models/Job";
import {Configuration} from "../../models/Configuration";

export const activePage = signal<string>("calendar");
activePage.subscribe(async (page, changed) => {
    if (!changed) {
        return;
    }
    await Api.setConfigKey("last_page", page);
});
export const assetList = signal<Asset[]>([]);
export const setList = signal<AssetSet[]>([]);
export const tagList = signal<Tag[]>([]);
export const jobList = signal<Job[]>([]);
export const currentCheckout = signal({
    assets: [],
    sets: []
});
export const scannerBuffer = signal<string>("");
export const configuration = signal<Configuration>({} as Configuration);

export function initializeStore() {
    Api.getConfig().then(conf => {
        if (conf.data) {
            const c = conf.data as Configuration;
            activePage.value = c.last_page;
            configuration.value = c;
        }
    });
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