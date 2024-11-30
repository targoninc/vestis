import {GenericTemplates} from "./generic.templates";
import {closeModal, createModal, toast} from "../classes/ui";
import {AssetTemplates} from "./asset.templates";
import {Api} from "../classes/api";
import {searchList} from "../classes/search";
import {AssetSet} from "../../models/AssetSet";
import {Callback, target} from "../classes/types";
import {compute, signal, Signal} from "../lib/fjsc/src/signals";
import {create, ifjs, signalMap, StringOrSignal} from "../lib/fjsc/src/f2";
import {ToastType} from "../enums/ToastType";
import {assetList, setList} from "../classes/store";

export class SetTemplates {
    static setList(setList: Signal<AssetSet[]>) {
        const headers = [
            {
                headerName: "Set name",
                propertyName: "setName",
            },
            {
                headerName: "Assets",
                propertyName: null,
            },
            {
                headerName: "Actions",
                propertyName: null,
            },
        ];
        const activeSortHeader = signal(null);

        return create("div")
            .classes("flex-v", "flex-grow", "main-panel", "panel")
            .children(
                create("span")
                    .text("Assets")
                    .build(),
                create("table")
                    .classes("full-width")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        headers.map(header => GenericTemplates.tableListHeader(header.headerName, header.propertyName, activeSortHeader, setList))
                                    ).build(),
                            ).build(),
                        signalMap<AssetSet>(setList, create("tbody"), set => {
                            return SetTemplates.set(set);
                        })
                    ).build(),
            ).build();
    }

    static set(set: AssetSet) {
        return create("tr")
            .children(
                create("td")
                    .text(set.setName)
                    .build(),
                create("td")
                    .text(set.assets.length)
                    .build(),
                create("td")
                    .children(
                        GenericTemplates.buttonWithIcon("edit", "Edit", () => {
                            createModal(SetTemplates.setForm(set, "Edit set", (data, done) => {
                                Api.updateSet(set.id, data).then(() => {
                                    Api.getSets().then(setsResponse => {
                                        if (setsResponse.success) {
                                            toast(`Set ${data.setName} updated`, null, ToastType.positive);
                                            setList.value = setsResponse.data as AssetSet[];
                                        }
                                        done();
                                    });
                                });
                            }));
                        }),
                        GenericTemplates.buttonWithIcon("delete", "Delete", () => {
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
                        }, ["negative"]),
                    ).build(),
            ).build();
    }

    static checkoutSetList(checkoutSets: Signal<AssetSet[]>) {
        const headers = [
            {
                headerName: "Set name",
                propertyName: "setName",
            },
            {
                headerName: "Assets",
                propertyName: null,
            },
            {
                headerName: "Actions",
                propertyName: null,
            },
        ];
        const activeSortHeader = signal(null);

        return create("div")
            .children(
                create("table")
                    .classes("full-width")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        headers.map(header => GenericTemplates.tableListHeader(header.headerName, header.propertyName, activeSortHeader, checkoutSets))
                                    ).build(),
                            ).build(),
                        signalMap<AssetSet>(checkoutSets, create("tbody"), set => {
                            return SetTemplates.checkoutSet(set);
                        })
                    ).build(),
            ).build();
    }

    static checkoutSet(set: AssetSet) {
        return create("tr")
            .children(
                create("td")
                    .text(set.setName)
                    .build(),
                create("td")
                    .text(set.assets.length)
                    .build(),
                create("td")
                    .text("")
                    .build(),
            ).build();
    }

    static setForm(set: Partial<AssetSet>, title: StringOrSignal, onSubmit: Callback<[AssetSet, any]> = (data, done) => {}) {
        const data = signal<AssetSet>({
            setName: "",
            assets: [],
            id: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            ...set,
        });
        const setName = compute(val => val.setName, data);
        const assets = compute(val => val.assets, data);
        const availableAssets = compute((assets, allAssets) => {
            return allAssets.filter(asset => {
                return !assets.some(a => a.id === asset.id);
                });
        }, assets, assetList);
        const loading = signal(false);
        const submitClass = compute((loading, setName): string => {
            if (loading || setName === "") {
                return "disabled";
            } else {
                return "_";
            }
        }, loading, setName);

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<string>("text", "setName", setName, "Set name", "Set name", "setName", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                setName: newValue ?? "",
                            };
                        }),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
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
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.buttonWithIcon("save", "Save", () => {
                            loading.value = true;
                            onSubmit(data.value, () => {
                                loading.value = false;
                                closeModal();
                            });
                        }, ["positive", submitClass]),
                        ifjs(loading, GenericTemplates.spinner()),
                    ).build()
            ).build();
    }

    static setSearch(availableSets: Signal<AssetSet[]>, onSelectSet: Callback<[AssetSet]> = (set) => {}) {
        const search = signal("");
        const filteredSets = compute((search, availableSets) => {
            if (search === "") {
                return availableSets;
            }
            const searchValue = search.toLowerCase();
            return searchList(["setName", "assets"], availableSets, searchValue);
        }, search, availableSets);

        return create("div")
            .classes("flex-v", "flex-grow", "search-panel")
            .children(
                create("span")
                    .text("Assets")
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input("text", "search", search, "Search", "Search", "search", ["full-width", "search-input"], () => {}, e => {
                            setTimeout(() => {
                                search.value = target(e).value;
                            }, 0);
                        }),
                    ).build(),
                create("table")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        create("th")
                                            .text("Set name")
                                            .build(),
                                        create("th")
                                            .text("Assets in set")
                                            .build(),
                                    ).build(),
                            ).build(),
                        signalMap<AssetSet>(filteredSets, create("tbody"), set => {
                            return SetTemplates.searchSet(set, onSelectSet);
                        })
                    ).build(),
            ).build();
    }

    static searchSet(set: AssetSet, onSelectSet: Callback<[AssetSet]>) {
        return create("tr")
            .onclick(() => {
                onSelectSet(set);
            })
            .children(
                create("td")
                    .text(set.setName)
                    .build(),
                create("td")
                    .text(set.assets.length)
                    .build(),
            ).build();
    }

    static setListWithQuantity(sets: Signal<AssetSet[]>, onRemoveSet: Callback<[AssetSet]>, onQuantityChange: Callback<[string, number]>) {
        const search = signal("");
        const filteredSets = signal([]);
        const filterSets = () => {
            if (search.value === "") {
                filteredSets.value = sets.value;
                return;
            }
            const searchValue = search.value.toLowerCase();
            filteredSets.value = searchList(["manufacturer", "model", "serialNumber"], sets.value, searchValue);
        };
        search.subscribe(filterSets);
        sets.subscribe(filterSets);
        filterSets();

        return create("div")
            .classes("flex-v", "flex-grow", "search-panel")
            .children(
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input("text", "search", search, "Search", "Search", "search", ["full-width", "search-input"], () => {}, e => {
                            setTimeout(() => {
                                search.value = target(e).value;
                            }, 0);
                        }),
                    ).build(),
                create("table")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        create("th")
                                            .text("Name")
                                            .build(),
                                        create("th")
                                            .text("Assets in set")
                                            .build(),
                                        create("th")
                                            .text("Actions")
                                            .build(),
                                    ).build(),
                            ).build(),
                        signalMap<AssetSet>(filteredSets, create("tbody"), set => {
                            return SetTemplates.setInJob(set, onRemoveSet);
                        })
                    ).build(),
            ).build();
    }

    static setInJob(set: AssetSet, onRemoveSet: Callback<[AssetSet]>) {
        return create("tr")
            .children(
                create("td")
                    .text(set.setName)
                    .build(),
                create("td")
                    .text(set.assets.length)
                    .build(),
                create("td")
                    .children(
                        GenericTemplates.buttonWithIcon("delete", "Remove", () => {
                            onRemoveSet(set);
                        }, ["negative"]),
                    ).build(),
            ).build();
    }
}