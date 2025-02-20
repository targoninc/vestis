import {AnyElement, AnyNode, create, ifjs} from "../lib/fjsc/src/f2";
import {GenericTemplates} from "./generic.templates";
import {Page, pages} from "../classes/pages";
import {AssetTemplates} from "./asset.templates";
import {CalendarTemplates} from "./calendar.templates";
import {CheckoutTemplates} from "./checkout.templates";
import {SetTemplates} from "./set.templates";
import {JobTemplates} from "./job.templates";
import {compute, Signal} from "../lib/fjsc/src/signals";
import {assetList, jobList, setList} from "../classes/store";
import {newJob, newSet} from "../classes/actions";
import {SettingsTemplates} from "./settings.templates";

export class LayoutTemplates {
    static app(activePage: Signal<string>) {
        return create("div")
            .classes("app", "no-wrap", "padded-big", "flex-v")
            .children(
                LayoutTemplates.topBar(activePage),
                LayoutTemplates.mainPanel(activePage),
            ).build();
    }

    static topBar(activePage: Signal<string>) {
        return create("div")
            .classes("flex")
            .children(
                pages.map((page: Page, i: number) => {
                    const active = compute((val): string => val === page.name ? "active" : "_", activePage);

                    return GenericTemplates.buttonWithIcon(page.icon, page.title, () => {
                        activePage.value = page.name;
                    }, ["navigation-button", active], [], (i + 1).toString());
                })
            ).build();
    }

    static mainPanel(activePage: Signal<string>) {
        return create("div")
            .classes("flex-v", "flex-grow", "main-panel", "panel")
            .children(
                LayoutTemplates.renderComponentIfActive("home", activePage, LayoutTemplates.home(activePage)),
                LayoutTemplates.renderComponentIfActive("assets", activePage, LayoutTemplates.assetsPage()),
                LayoutTemplates.renderComponentIfActive("sets", activePage, LayoutTemplates.setsPage()),
                LayoutTemplates.renderComponentIfActive("jobs", activePage, LayoutTemplates.jobsPage()),
                LayoutTemplates.renderComponentIfActive("calendar", activePage, CalendarTemplates.calendar(activePage)),
                LayoutTemplates.renderComponentIfActive("checkout", activePage, CheckoutTemplates.checkout(activePage)),
                LayoutTemplates.renderComponentIfActive("settings", activePage, SettingsTemplates.settings(activePage)),
            ).build();
    }

    static assetsPage() {
        const selectedAssetId = compute(assetList => assetList.length > 0 ? assetList[0].id : null, assetList);
        const selectedAsset = compute((list, id) => list.find(a => a.id === id), assetList, selectedAssetId);

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        AssetTemplates.assetList(assetList, selectedAssetId),
                    ).build(),
                ifjs(selectedAssetId, AssetTemplates.assetCard(selectedAsset)),
            ).build();
    }

    static setsPage() {
        return create("div")
            .classes("flex-v")
            .children(
                SetTemplates.setList(setList),
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