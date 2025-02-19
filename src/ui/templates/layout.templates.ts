import {AnyElement, AnyNode, create, ifjs} from "../lib/fjsc/src/f2";
import {GenericTemplates} from "./generic.templates";
import {Page, pages} from "../classes/pages";
import {AssetTemplates} from "./asset.templates";
import {CalendarTemplates} from "./calendar.templates";
import {CheckoutTemplates} from "./checkout.templates";
import {Api} from "../classes/api";
import {createModal, toast} from "../classes/ui";
import {SetTemplates} from "./set.templates";
import {JobTemplates} from "./job.templates";
import {compute, Signal} from "../lib/fjsc/src/signals";
import {ToastType} from "../enums/ToastType";
import {assetList, jobList, setList} from "../classes/store";
import {Job} from "../../models/Job";
import {newAsset, newSet} from "../classes/actions";

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
            ).build();
    }

    static assetsPage() {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(GenericTemplates.buttonWithIcon("add", "New asset", newAsset, ["positive"]))
                    .build(),
                AssetTemplates.assetList(assetList),
            ).build();
    }

    static setsPage() {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(GenericTemplates.buttonWithIcon("add", "New set", newSet, ["positive"]))
                    .build(),
                SetTemplates.setList(setList),
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

    static jobsPage() {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.buttonWithIcon("add", "Add job", () => {
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
                        }),
                    ),
                JobTemplates.jobList(jobList),
            ).build();
    }
}