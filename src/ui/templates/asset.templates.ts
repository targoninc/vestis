import {GenericTemplates} from "./generic.templates";
import {closeModal, createModal, toast} from "../classes/ui";
import {Api} from "../classes/api";
import {AssetTypes, Callback} from "../classes/types";
import {searchList} from "../classes/search";
import {DayRateCalculator} from "../classes/dayRateCalculator";
import {Asset} from "../../models/Asset";
import {ApiResponse} from "../classes/api.base";
import {compute, Signal, signal} from "../lib/fjsc/src/signals";
import {create, ifjs, signalMap} from "../lib/fjsc/src/f2";
import {ToastType} from "../enums/ToastType";
import {Tag} from "../../models/Tag";
import {activePage, assetList} from "../classes/store";
import {createPriceFromCents} from "../classes/currency";
import {newAsset} from "../classes/actions";

export class AssetTemplates {
    static assetList(assetList: Signal<Asset[]>, selectedAssetId: Signal<string>) {
        const headers = [
            {
                headerName: "Manufacturer",
                property: "manufacturer",
            },
            {
                headerName: "Model",
                property: "model",
            },
            {
                headerName: "Serial",
                property: "serialNumber",
            },
            {
                headerName: "Unique",
                property: "isUnique",
            },
            {
                headerName: "Identifier",
                property: "uniqueString",
            },
            {
                headerName: "Count",
                property: "count",
            },
            {
                headerName: "Actions",
                property: null,
            },
        ];
        const activeSortHeader = signal(null);
        const search = signal("");
        const searchProperties = ["manufacturer", "model", "serialNumber", "uniqueString", "tags"];
        const filteredAssetList = signal<Asset[]>([]);
        const filterAssets = () => {
            if (search.value === "") {
                filteredAssetList.value = assetList.value;
                return;
            }
            const searchValue = search.value.toLowerCase();
            filteredAssetList.value = searchList(searchProperties, assetList.value, searchValue);
        };
        search.subscribe(filterAssets);
        assetList.subscribe(filterAssets);
        filterAssets();

        return create("div")
            .classes("flex-v", "flex-grow")
            .children(
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input("text", "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
                        create("div")
                            .classes("flex")
                            .children(GenericTemplates.buttonWithIcon("add", "New asset", newAsset, ["positive"], [], "N"))
                            .build(),
                    ).build(),
                create("table")
                    .classes("full-width")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        headers.map(header => GenericTemplates.tableListHeader(header.headerName, header.property, activeSortHeader, assetList))
                                    ).build(),
                            ).build(),
                        signalMap(filteredAssetList, create("tbody"), (a: Asset) => AssetTemplates.asset(a, selectedAssetId))
                    ).build(),
            ).build();
    }

    static checkoutAssetList(assetList: Signal<Asset[]>) {
        return create("div")
            .children(
                create("table")
                    .children(
                        create("thead")
                            .children(
                                create("tr")
                                    .children(
                                        create("th")
                                            .text("Manufacturer")
                                            .build(),
                                        create("th")
                                            .text("Model")
                                            .build(),
                                        create("th")
                                            .text("Serial")
                                            .build(),
                                        create("th")
                                            .text("Quantity")
                                            .build(),
                                    ).build(),
                            ).build(),
                        signalMap(assetList, create("tbody"), AssetTemplates.checkoutAsset)
                    ).build(),
            ).build();
    }

    static checkoutAsset(asset: Asset) {
        return create("tr")
            .children(
                create("td")
                    .text(asset.manufacturer)
                    .build(),
                create("td")
                    .text(asset.model)
                    .build(),
                create("td")
                    .text(asset.serialNumber)
                    .build(),
                create("td")
                    .text(asset.count)
                    .build(),
            ).build();
    }

    static asset(asset: Asset, selectedAssetId: Signal<string>) {
        const activeClass = compute((id): string => id === asset.id ? "active" : "_", selectedAssetId);

        return create("tr")
            .classes("clickable", activeClass)
            .onclick(() => {
                selectedAssetId.value = asset.id;
            })
            .children(
                create("td")
                    .text(asset.manufacturer)
                    .build(),
                create("td")
                    .text(asset.model)
                    .build(),
                create("td")
                    .text(asset.serialNumber)
                    .build(),
                create("td")
                    .text(asset.isUnique)
                    .build(),
                create("td")
                    .text(asset.uniqueString)
                    .build(),
                create("td")
                    .text(asset.count)
                    .build(),
                create("td")
                    .children(
                        AssetTemplates.assetActions(asset)
                    ).build(),
            ).build();
    }

    static assetActions(asset: Asset) {
        return create("div")
            .classes("flex", "align-center")
            .children(
                GenericTemplates.buttonWithIcon("edit", "Edit", () => {
                    createModal(AssetTemplates.assetForm(asset, "Edit asset", (data, done) => {
                        Api.updateAsset(asset.id, data).then(() => {
                            Api.getAssets().then((assetsResponse: ApiResponse<Asset[] | string>) => {
                                if (assetsResponse.success) {
                                    toast(`Asset ${data.manufacturer}/${data.model} updated`, null, ToastType.positive);
                                    assetList.value = assetsResponse.data as Asset[];
                                }
                                done();
                            });
                        });
                    }));
                }),
                GenericTemplates.buttonWithIcon("delete", "Delete", () => {
                    createModal(GenericTemplates.confirmModalWithContent("Delete asset", create("div")
                        .classes("flex-v")
                        .children(
                            create("p")
                                .text(`Are you sure you want to delete the following asset?`)
                                .build(),
                            GenericTemplates.propertyList(asset)
                        ).build(), "Yes", "No", () => {
                        Api.deleteAssetByIdOrUniqueString(asset.id).then(() => {
                            toast(`Asset ${asset.manufacturer}/${asset.model} deleted`, null, ToastType.positive);
                            assetList.value = assetList.value.filter(a => a.id !== asset.id);
                        });
                    }));
                }, ["negative"]),
            ).build();
    }

    static searchAsset(asset: Asset, onSelectAsset: (asset: Asset) => void) {
        return create("tr")
            .onclick(() => {
                onSelectAsset(asset);
            })
            .children(
                create("td")
                    .text(asset.manufacturer)
                    .build(),
                create("td")
                    .text(asset.model)
                    .build(),
                create("td")
                    .text(asset.serialNumber)
                    .build(),
                create("td")
                    .text(asset.isUnique)
                    .build(),
                create("td")
                    .text(asset.uniqueString)
                    .build(),
            ).build();
    }

    static assetForm(assetData: Partial<Asset>, title: string, onSubmit = (data: Partial<Asset>, done: any) => {}) {
        const maxUniqueId = assetList.value.reduce((max: number, asset) => {
            const number = parseInt(asset.uniqueString);
            if (isNaN(number)) return max;

            return Math.max(max, number);
        }, 0);
        const data = signal<Partial<Asset> & { tags: Tag[] }>({
            type: AssetTypes.other.id,
            manufacturer: "",
            model: "",
            serialNumber: "",
            isUnique: 1,
            uniqueString: (maxUniqueId + 1).toString().padStart(6, "0"),
            count: 1,
            priceInCents: 0,
            description: "",
            dayRate: DayRateCalculator.getRateForType(AssetTypes.other.id),
            tags: [],
            ...assetData,
        });
        const type = compute(val => val.type, data);
        const typeIcon = compute(type => AssetTypes[type].icon, type);
        const manufacturer = compute(val => val.manufacturer, data);
        const model = compute(val => val.model, data);
        const serialNumber = compute(val => val.serialNumber, data);
        const isUnique = compute(val => val.isUnique, data);
        const uniqueString = compute(val => val.uniqueString, data);
        const priceInCents = compute(val => val.priceInCents, data);
        const dayRateFactor = compute(val => val.dayRate, data);
        const dayRate = compute(val => DayRateCalculator.calculateDayRate(val.dayRate, val.priceInCents), data);
        const description = compute(val => val.description, data);
        const count = compute(val => val.count, data);
        const error = compute(d => {
            if (d.manufacturer === "" || d.model === "") {
                return "Manufacturer and model are required.";
            }

            if (d.isUnique && d.uniqueString === "") {
                return "Unique string is required.";
            }

            return null;
        }, data);
        const loading = signal(false);
        const submitClass = compute((l, e) => l || e ? "disabled" : "_", loading, error);

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.select("Type", Object.values(AssetTypes).map(type => {
                            return {
                                text: type.name,
                                value: type.id,
                            };
                        }), type, (newValue) => {
                            data.value = {
                                ...data.value,
                                type: newValue,
                                dayRate: DayRateCalculator.getRateForType(newValue) ?? data.value.dayRate,
                            };
                        }),
                        ifjs(typeIcon, GenericTemplates.icon(typeIcon, ["type-icon", type]))
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.input<string>("text", "manufacturer", manufacturer, "Company", "Manufacturer", "manufacturer", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                manufacturer: newValue ?? "",
                            };
                        }, [], true),
                        GenericTemplates.input<string>("text", "model", model, "Model", "Model", "model", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                model: newValue ?? "",
                            };
                        }, [], true),
                        GenericTemplates.input<string>("text", "serialNumber", serialNumber, "Serial", "Serial", "serialNumber", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                serialNumber: newValue ?? "",
                            };
                        }),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.textArea(description, "Description", "description", text => {
                            data.value = {
                                ...data.value,
                                description: text,
                            };
                        }),
                    ).build(),
                GenericTemplates.toggle("Unique", isUnique, (newValue) => {
                    data.value = {
                        ...data.value,
                        isUnique: newValue ? 1 : 0,
                    };
                }),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<string>("text", "uniqueString", uniqueString, "Unique String", "Unique String", "uniqueString", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                uniqueString: newValue ?? "",
                            };
                        }),
                        GenericTemplates.input<number>("number", "count", count, "Count", "Count", "count", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                count: newValue ?? 0,
                            };
                        }),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.priceInput(priceInCents, "Recommended retail price", (newValue) => {
                            data.value = {
                                ...data.value,
                                priceInCents: newValue ?? 0,
                            };
                        }),
                        GenericTemplates.input<number>("number", "dayRate", dayRateFactor, "Day rate factor", "Day rate factor", "dayRate", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                dayRate: newValue ?? 0,
                            };
                        }),
                        GenericTemplates.priceDisplay(dayRate, "Day rate")
                    ).build(),
                create("h3")
                    .text("Tags")
                    .build(),
                GenericTemplates.tagList(data, newTags => {
                    data.value = {
                        ...data.value,
                        tags: newTags,
                    };
                }),
                ifjs(error, create("div")
                    .classes("error")
                    .text(error)
                    .build()),
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

    static assetSearch(availableAssets: Signal<Asset[]>, onSelectAsset: Callback<[Asset]> = (asset) => {}) {
        const search = signal("");
        const filteredAssets = signal([]);
        const filterAssets = () => {
            if (search.value === "") {
                filteredAssets.value = availableAssets.value;
                return;
            }
            const searchValue = search.value.toLowerCase();
            filteredAssets.value = searchList(["manufacturer", "model", "serialNumber"], availableAssets.value, searchValue);
        };
        search.subscribe(filterAssets);
        availableAssets.subscribe(filterAssets);
        filterAssets();

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
                                            .text("Manufacturer")
                                            .build(),
                                        create("th")
                                            .text("Model")
                                            .build(),
                                        create("th")
                                            .text("Serial")
                                            .build(),
                                        create("th")
                                            .text("Unique")
                                            .build(),
                                        create("th")
                                            .text("Unique String")
                                            .build(),
                                    ).build(),
                            ).build(),
                        signalMap<Asset>(filteredAssets, create("tbody"), asset => {
                            return AssetTemplates.searchAsset(asset, onSelectAsset);
                        })
                    ).build(),
            ).build();
    }

    static assetListWithQuantity(assets: Signal<Asset[]>, onRemoveAsset: Callback<[Asset]>, onQuantityChange: Callback<[string, number]>) {
        const search = signal("");
        const filteredAssets = compute((search, assets) => {
            if (search === "") {
                return assets;
            }
            const searchValue = search.toLowerCase();
            return searchList(["manufacturer", "model", "serialNumber"], assets, searchValue);
        }, search, assets);

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
                                        create("th")
                                            .text("Manufacturer")
                                            .build(),
                                        create("th")
                                            .text("Model")
                                            .build(),
                                        create("th")
                                            .text("Serial")
                                            .build(),
                                        create("th")
                                            .text("Stock")
                                            .build(),
                                        create("th")
                                            .text("Quantity")
                                            .build(),
                                        create("th")
                                            .text("Actions")
                                            .build(),
                                    ).build(),
                            ).build(),
                        signalMap<Asset>(filteredAssets, create("tbody"), asset => {
                            return AssetTemplates.assetWithQuantity(asset, onRemoveAsset, onQuantityChange);
                        })
                    ).build(),
            ).build();
    }

    static assetWithQuantity(asset: Asset, onRemoveAsset: Callback<[Asset]>, onQuantityChange: Callback<[string, number]>) {
        const quantity = signal(asset.count ?? 1);
        quantity.subscribe((newQuantity) => {
            onQuantityChange(asset.id, newQuantity);
        });
        const removeClass = signal(quantity.value === 0 ? "disabled" : "_");
        const addClass = signal(quantity.value === asset.count ? "disabled" : "_");
        quantity.subscribe(q => {
            if (q === 0) {
                removeClass.value = "disabled";
                addClass.value = "disabled";
            } else if (q === asset.count) {
                removeClass.value = "disabled";
                addClass.value = "_";
            } else {
                removeClass.value = "_";
                addClass.value = "_";
            }
        });

        return create("tr")
            .children(
                create("td")
                    .text(asset.manufacturer)
                    .build(),
                create("td")
                    .text(asset.model)
                    .build(),
                create("td")
                    .text(asset.serialNumber)
                    .build(),
                create("td")
                    .text(asset.count)
                    .build(),
                create("td")
                    .children(
                        create("div")
                            .classes("flex", "align-center")
                            .children(
                                ifjs(asset.isUnique, GenericTemplates.buttonWithIcon("remove", "", () => {
                                    quantity.value = Math.max(0, quantity.value - 1);
                                }, ["negative", removeClass]), true),
                                ifjs(asset.isUnique, GenericTemplates.buttonWithIcon("add", "", () => {
                                    quantity.value = Math.min(asset.count, quantity.value + 1);
                                }, ["positive", addClass]), true),
                                create("span")
                                    .text(quantity)
                                    .build(),
                            ).build(),
                    ).build(),
                create("td")
                    .children(
                        GenericTemplates.buttonWithIcon("delete", "Remove", () => {
                            onRemoveAsset(asset);
                        }, ["negative"]),
                    ).build(),
            ).build();
    }

    static assetCard(selectedAsset: Signal<Asset>) {
        const name = compute(asset => `${asset?.manufacturer} ${asset?.model}`, selectedAsset);
        const description = compute(asset => asset?.description, selectedAsset);
        const serialNumber = compute(asset => asset?.serialNumber, selectedAsset);
        const id = compute(asset => asset?.id, selectedAsset);
        const type = compute(asset => asset?.type, selectedAsset);
        const uniqueString = compute(asset => asset?.uniqueString, selectedAsset);
        const priceInCents = compute(asset => createPriceFromCents(asset?.priceInCents), selectedAsset);
        const dayRateFactor = compute(asset => asset?.dayRate, selectedAsset);
        const dayRate = compute(asset => createPriceFromCents(DayRateCalculator.calculateDayRate(asset?.dayRate, asset?.priceInCents)), selectedAsset);
        const count = compute(asset => asset?.count, selectedAsset);
        const createdAt = compute(asset => new Date(asset?.createdAt).toLocaleString(), selectedAsset);
        const updatedAt = compute(asset => new Date(asset?.updatedAt).toLocaleString(), selectedAsset);

        return create("div")
            .classes("flex-v", "bordered-panel", "flex-grow")
            .children(
                GenericTemplates.heading(2, name),
                create("p")
                    .text(description)
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        GenericTemplates.property("Database ID", id),
                        GenericTemplates.property("Type", type),
                        GenericTemplates.property("Serial number", serialNumber),
                        GenericTemplates.property("Unique string", uniqueString),
                        GenericTemplates.property("Retail price", priceInCents),
                        GenericTemplates.property("Day rate factor", dayRateFactor),
                        GenericTemplates.property("Day rate", dayRate),
                        GenericTemplates.property("Count", count),
                        GenericTemplates.property("Created at", createdAt),
                        GenericTemplates.property("Updated at", updatedAt),
                    ).build(),
            ).build();
    }
}