import {AnyElement, AnyNode, create, ifjs, StringOrSignal} from "../lib/fjsc/src/f2";
import {GenericTemplates} from "./generic.templates";
import {pages} from "../enums/pages";
import {AssetTemplates} from "./asset.templates";
import {CalendarTemplates} from "./calendar.templates";
import {CheckoutTemplates} from "./checkout.templates";
import {SetTemplates} from "./set.templates";
import {JobTemplates} from "./job.templates";
import {compute, signal, Signal} from "../lib/fjsc/src/signals";
import {assetList, configuration, jobList, setList} from "../classes/store";
import {newAsset, newJob, newSet} from "../classes/actions";
import {SettingsTemplates} from "./settings.templates";
import {Asset} from "../../models/Asset";
import {getGreeting} from "../classes/greetings";

export class LayoutTemplates {
    static app(activePage: Signal<string>) {
        const tabs = [
            LayoutTemplates.home(activePage),
            LayoutTemplates.assetsPage(assetList),
            LayoutTemplates.setsPage(),
            LayoutTemplates.jobsPage(),
            CalendarTemplates.calendar(activePage),
            CheckoutTemplates.checkout(activePage),
            SettingsTemplates.settings(activePage),
        ];

        return create("div")
            .classes("app", "no-wrap", "padded-big", "flex-v")
            .children(
                GenericTemplates.tabs(tabs, signal(pages), activePage),
            ).build();
    }

    static assetsPage(assets: Signal<Asset[]>) {
        const selectedAssetId = compute(assetList => assetList?.length > 0 ? assetList[0].id : null, assets);
        const selectedAsset = compute((list, id) => list?.find(a => a.id === id), assets, selectedAssetId);

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        AssetTemplates.assetList(assets, selectedAssetId),
                    ).build(),
                ifjs(selectedAssetId, AssetTemplates.assetCard(selectedAsset, selectedAssetId)),
            ).build();
    }

    static setsPage() {
        const selectedSetId = compute(setList => setList?.length > 0 ? setList[0].id : null, setList);
        const selectedSet = compute((list, id) => list.find(s => s.id === id), setList, selectedSetId);

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        SetTemplates.setList(setList, selectedSetId),
                    ).build(),
                ifjs(selectedSetId, SetTemplates.setCard(selectedSet)),
            ).build();
    }

    static jobsPage() {
        const selectedJobId = compute(jobList => jobList?.length > 0 ? jobList[0].id : null, jobList);
        const selectedJob = compute((list, id) => list?.find(j => j.id === id), jobList, selectedJobId);

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(JobTemplates.jobList(jobList, selectedJobId))
                    .build(),
                ifjs(selectedJobId, JobTemplates.jobCard(selectedJob, selectedJobId)),
            ).build();
    }

    static modal(content: AnyNode) {
        const self = create("div")
            .classes("modal")
            .children(
                create("div")
                    .classes("modal-content")
                    .children(
                        content,
                        create("div")
                            .classes("modal-close")
                            .children(
                                GenericTemplates.buttonWithIcon("close", "Close", () => {
                                    self.remove();
                                }),
                            ).build(),
                    ).build(),
            ).build();

        return self;
    }

    static home(activePage: Signal<string>) {
        const assetCount = compute(assetList => assetList.length + " assets", assetList);
        const setCount = compute(setList => setList.length + " sets", setList);
        const jobCount = compute(jobList => jobList.length + " jobs", jobList);
        const greeting = compute(c => getGreeting(c.username), configuration);

        return create("div")
            .classes("flex-v", "flex-grow", "main-panel", "panel")
            .children(
                GenericTemplates.heading(1, greeting),
                create("div")
                    .classes("flex")
                    .children(
                        LayoutTemplates.card(assetCount, [
                            GenericTemplates.buttonWithIcon("category", "View assets", () => activePage.value = "assets"),
                            GenericTemplates.buttonWithIcon("add", "New asset", newAsset, ["positive"]),
                        ]),
                        LayoutTemplates.card(setCount, [
                            GenericTemplates.buttonWithIcon("inventory_2", "View sets", () => activePage.value = "sets"),
                            GenericTemplates.buttonWithIcon("add", "New set", newSet, ["positive"]),
                        ]),
                        LayoutTemplates.card(jobCount, [
                            GenericTemplates.buttonWithIcon("work", "View jobs", () => activePage.value = "jobs"),
                            GenericTemplates.buttonWithIcon("add", "New job", newJob, ["positive"]),
                        ]),
                    ).build()
            ).build();
    }

    static card(title: StringOrSignal, children: (AnyNode)[]) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(...children)
                    .build()
            ).build();
    }
}