import {AnyElement, AnyNode, create, ifjs} from "../lib/fjsc/src/f2";
import {GenericTemplates} from "./generic.templates";
import {pages} from "../classes/pages";
import {AssetTemplates} from "./asset.templates";
import {CalendarTemplates} from "./calendar.templates";
import {CheckoutTemplates} from "./checkout.templates";
import {SetTemplates} from "./set.templates";
import {JobTemplates} from "./job.templates";
import {compute, signal, Signal} from "../lib/fjsc/src/signals";
import {assetList, jobList, setList} from "../classes/store";
import {newJob} from "../classes/actions";
import {SettingsTemplates} from "./settings.templates";
import {Asset} from "../../models/Asset";

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
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(GenericTemplates.buttonWithIcon("add", "Add job", newJob, ["positive"], [], "N"),),
                JobTemplates.jobList(jobList),
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
        return create("div")
            .classes("flex-v", "flex-grow", "main-panel", "panel")
            .children(
                create("span")
                    .text("Hi! :D")
                    .build(),
                create("span")
                    .text(activePage)
                    .build(),
            ).build();
    }

    static renderComponentIfActive(pageName: string, activePage: Signal<string>, component: AnyElement) {
        const active = compute(val => val === pageName, activePage);

        return ifjs(active, component);
    }
}