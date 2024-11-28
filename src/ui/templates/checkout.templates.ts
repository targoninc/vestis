import {GenericTemplates} from "./generic.templates";
import {AssetTemplates} from "./asset.templates";
import {createModal, toast} from "../classes/ui";
import {SetTemplates} from "./set.templates.js";
import {JobTemplates} from "./job.templates.js";
import {Api} from "../classes/api";
import {compute, Signal} from "../lib/fjsc/src/signals";
import {create} from "../lib/fjsc/src/f2";
import {ToastType} from "../enums/ToastType";
import {currentCheckout, jobList} from "../classes/store";
import {Job} from "../../models/Job";

export class CheckoutTemplates {
    static checkout(activePage: Signal<string>) {
        const assetCount = compute(checkout => checkout.assets.length + " assets in checkout", currentCheckout);
        const setCount = compute(checkout => checkout.sets.length + " sets in checkout", currentCheckout);
        const checkoutAssets = compute(checkout => checkout.assets, currentCheckout);
        const checkoutSets = compute(checkout => checkout.sets, currentCheckout);

        return create("div")
            .classes("flex-v", "flex-grow", "main-panel", "panel")
            .children(
                create("span")
                    .text("Checkout")
                    .build(),
                create("span")
                    .text(assetCount)
                    .build(),
                AssetTemplates.checkoutAssetList(checkoutAssets),
                create("span")
                    .text(setCount)
                    .build(),
                SetTemplates.checkoutSetList(checkoutSets),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.buttonWithIcon("save", "Create job", () => {
                            activePage.value = "jobs";
                            createModal(JobTemplates.jobForm({ assets: checkoutAssets.value, sets: checkoutSets.value }, "New job", (data, done) => {
                                Api.createJob(data).then(() => {
                                    Api.getJobs().then(jobsResponse => {
                                        if (jobsResponse.success) {
                                            toast(`Job ${data.jobNumber} created`, null, ToastType.positive);
                                            jobList.value = jobsResponse.data as Job[];
                                        }
                                        done();
                                    });
                                });
                            }));
                        }, ["positive"]),
                        GenericTemplates.buttonWithIcon("delete", "Clear checkout", () => {
                            currentCheckout.value = {
                                assets: [],
                                sets: [],
                            };
                        }, ["negative"])
                    ).build()
            ).build();
    }
}