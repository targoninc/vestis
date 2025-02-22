import {GenericTemplates} from "./generic.templates";
import {closeModal, createModal, toast} from "../classes/ui";
import {AssetTemplates} from "./asset.templates";
import {Api} from "../classes/api";
import {searchList} from "../classes/search";
import {AssetSet} from "../../models/AssetSet";
import {Callback} from "../classes/types";
import {compute, signal, Signal} from "../lib/fjsc/src/signals";
import {create, ifjs, signalMap, StringOrSignal} from "../lib/fjsc/src/f2";
import {ToastType} from "../enums/ToastType";
import {assetList, setList} from "../classes/store";
import {deleteSet, newSet} from "../classes/actions";

export class SetTemplates {
    static setList(setList: Signal<AssetSet[]>, selectedSetId: Signal<string>) {
        const headers = [
            {
                headerName: "Set name",
                property: "setName",
            },
            {
                headerName: "Different assets",
                property: "assets.length",
            },
            {
                headerName: "Total asset count",
                property: (s: AssetSet) => s.assets.reduce((total, asset) => total + asset.quantity, 0),
            },
        ];
        const activeSortHeader = signal(null);
        const search = signal("");
        const searchProperties = ["setName", "assets"];
        const filteredAssetList = signal<AssetSet[]>([]);
        const filterItems = () => {
            if (search.value === "") {
                filteredAssetList.value = setList.value;
                return;
            }
            const searchValue = search.value.toLowerCase();
            filteredAssetList.value = searchList(searchProperties, setList.value, searchValue);
        };
        search.subscribe(filterItems);
        setList.subscribe(filterItems);
        filterItems();

        return create("div")
            .classes("flex-v", "flex-grow")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.input("text", "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
                        GenericTemplates.buttonWithIcon("add", "New set", newSet, ["positive"], [], "N"),
                    ).build(),
                create("table")
                    .classes("full-width")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        headers.map(header => GenericTemplates.tableListHeader(header.headerName, header.property, activeSortHeader, setList))
                                    ).build(),
                            ).build(),
                        signalMap<AssetSet>(filteredAssetList, create("tbody"), s => SetTemplates.set(s, selectedSetId))
                    ).build(),
            ).build();
    }

    static set(set: AssetSet, selectedSetId: Signal<string>) {
        const activeClass = compute((id): string => id === set.id ? "active" : "_", selectedSetId);

        return create("tr")
            .classes("clickable", activeClass)
            .onclick(() => {
                selectedSetId.value = set.id;
            })
            .children(
                create("td")
                    .text(set.setName)
                    .build(),
                create("td")
                    .text(set.assets.length)
                    .build(),
                create("td")
                    .text(set.assets.reduce((total, asset) => total + asset.quantity, 0))
                    .build(),
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

    static setForm(set: Partial<AssetSet>, title: StringOrSignal, onSubmit: Callback<[AssetSet, any]> = (data, done) => {}, isModal = true) {
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
                                if (isModal) {
                                    closeModal();
                                }
                            });
                        }, ["positive", submitClass]),
                        ifjs(set && set.id, GenericTemplates.buttonWithIcon("delete", "Delete", () => deleteSet(set), ["negative"])),
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
                        GenericTemplates.input("text", "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
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
        const headers = [
            {
                headerName: "Set name",
                propertyName: "setName",
            },
            {
                headerName: "Assets in set",
                propertyName: "assets.length",
            }
        ];
        const activeSortHeader = signal(null);
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
                        GenericTemplates.input("text", "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
                    ).build(),
                create("table")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        headers.map(header => GenericTemplates.tableListHeader(header.headerName, header.propertyName, activeSortHeader, setList))
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

    static setCard(selectedSet: Signal<AssetSet>) {
        const form = compute(set => {
            return SetTemplates.setForm(set, "Edit set", (data, done) => {
                Api.updateSet(set.id, data).then(() => {
                    Api.getSets().then(setsResponse => {
                        if (setsResponse.success) {
                            toast(`Set ${data.setName} updated`, null, ToastType.positive);
                            setList.value = setsResponse.data as AssetSet[];
                        }
                        done();
                    });
                });
            }, false);
        }, selectedSet);

        return create("div")
            .classes("flex-v", "bordered-panel", "flex-grow")
            .children(form)
            .build();
    }
}