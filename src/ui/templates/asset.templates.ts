import {GenericTemplates} from "./generic.templates";
import {closeModal} from "../classes/ui";
import {AssetTypes, Callback} from "../classes/types";
import {searchList} from "../classes/search";
import {DayRateCalculator} from "../classes/dayRateCalculator";
import {Asset} from "../../models/Asset";
import {compute, Signal, signal} from "../lib/fjsc/src/signals";
import {create, ifjs, signalMap} from "../lib/fjsc/src/f2";
import {Tag} from "../../models/Tag";
import {assetList, jobList} from "../classes/store";
import {deleteAsset, getUpdateAssetMethod, newAsset, newSet} from "../classes/actions";
import {itemFromAsset} from "../classes/availabilityCalculator";
import {InputType} from "../lib/fjsc/src/Types";

export class AssetTemplates {
    static assetList(assetList: Signal<Asset[]>, selectedAssetId: Signal<string>) {
        const headers = [
            {
                headerName: "Manufacturer",
                propertyName: "manufacturer",
            },
            {
                headerName: "Model",
                propertyName: "model",
            },
            {
                headerName: "Serial",
                propertyName: "serialNumber",
            },
            {
                headerName: "Identifier",
                propertyName: "uniqueString",
            },
            {
                headerName: "Count",
                propertyName: "count",
            }
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
                        GenericTemplates.input(InputType.text, "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
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
                                        ...headers.map(header => GenericTemplates.tableListHeader(header.headerName, header.propertyName, activeSortHeader, assetList))
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
                    .text(asset.uniqueString)
                    .build(),
                create("td")
                    .text(asset.count)
                    .build()
            ).build();
    }

    static searchAsset(asset: Asset, onSelectAsset: (asset: Asset) => void) {
        return create("tr")
            .classes("clickable")
            .onclick(() => {
                onSelectAsset(asset);
            })
            .children(
                create("td")
                    .children(
                        create("div")
                            .styles("width", "max-content")
                            .onclick((e: Event) => {
                                e.stopPropagation();
                            }).children(
                                GenericTemplates.itemName(itemFromAsset(asset))
                            ).build(),
                    ).build(),
                create("td")
                    .text(asset.serialNumber)
                    .build(),
                create("td")
                    .text(asset.count)
                    .build(),
                create("td")
                    .text(asset.uniqueString)
                    .build(),
            ).build();
    }

    static assetForm(assetData: Partial<Asset>, title: string, onSubmit = (data: Partial<Asset>, done: any) => {}, isModal = true) {
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
            uniqueString: (maxUniqueId + 1).toString().padStart(6, "0"),
            count: 1,
            priceInCents: 0,
            description: "",
            dayRate: 0,
            dayRateFactor: DayRateCalculator.getRateForType(assetData?.type ?? AssetTypes.other.id),
            tags: [],
            ...assetData,
        });
        const initialData = data.value;
        const notSaved = compute(d => JSON.stringify(d) !== JSON.stringify(initialData), data);
        const type = compute(val => val.type, data);
        const typeIcon = compute(type => AssetTypes[type].icon, type);
        const manufacturer = compute(val => val.manufacturer, data);
        const model = compute(val => val.model, data);
        const serialNumber = compute(val => val.serialNumber, data);
        const uniqueString = compute(val => val.uniqueString, data);
        const priceInCents = compute(val => val.priceInCents, data);
        const dayRateFactor = compute(val => val.dayRateFactor, data);
        const overrideDayRate = compute(val => val.dayRate, data);
        const effectiveDayRate = compute(val => DayRateCalculator.calculateDayRate(val.dayRate, val.dayRateFactor, val.priceInCents), data);
        const description = compute(val => val.description, data);
        const count = compute(val => val.count, data);
        const error = compute(d => {
            if (d.manufacturer === "" || d.model === "") {
                return "Manufacturer and model are required.";
            }

            return null;
        }, data);
        const loading = signal(false);
        const notSaveable = compute((l, e) => l || !!e, loading, error);
        const isUpdate = !!(assetData && assetData.id);
        const inJobs = compute(jobs => isUpdate ? jobs.filter(job => job.assets.filter(asset => asset.id === assetData.id)) : [], jobList);

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
                                dayRateFactor: DayRateCalculator.getRateForType(newValue) ?? data.value.dayRate,
                            };
                        }),
                        ifjs(typeIcon, GenericTemplates.icon(typeIcon, ["type-icon", type]))
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.input<string>(InputType.text, "manufacturer", manufacturer, "Company", "Manufacturer", "manufacturer", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                manufacturer: newValue ?? "",
                            };
                        }, [], true),
                        GenericTemplates.input<string>(InputType.text, "model", model, "Model", "Model", "model", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                model: newValue ?? "",
                            };
                        }, [], true),
                        GenericTemplates.input<string>(InputType.text, "serialNumber", serialNumber, "Serial", "Serial", "serialNumber", [], (newValue) => {
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
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<string>(InputType.text, "uniqueString", uniqueString, "Unique String", "Unique String", "uniqueString", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                uniqueString: newValue ?? "",
                            };
                        }),
                        GenericTemplates.input<number>(InputType.number, "count", count, "Owned count", "Owned count", "count", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                count: newValue ?? 0,
                            };
                        }),
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.priceInput(priceInCents, "Retail price", (newValue) => {
                            data.value = {
                                ...data.value,
                                priceInCents: newValue ?? 0,
                            };
                        }),
                        GenericTemplates.input<number>(InputType.number, "dayRateFactor", dayRateFactor, "Day rate factor", "Day rate factor", "dayRateFactor", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                dayRateFactor: newValue ?? 0,
                            };
                        }),
                        GenericTemplates.priceInput(overrideDayRate, "Override day rate", (newValue) => {
                            data.value = {
                                ...data.value,
                                dayRate: newValue ?? 0,
                            };
                        }),
                        GenericTemplates.priceDisplay(effectiveDayRate, "Effective day rate")
                    ).build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.input<number>(InputType.number, "weightInGrams", priceInCents, "Weight in grams", "Weight in grams", "weightInGrams", [], (newValue) => {
                            data.value = {
                                ...data.value,
                                weightInGrams: newValue ?? 0,
                            };
                        }),
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
                        ifjs(isUpdate, GenericTemplates.buttonWithIcon("delete", "Delete", () => deleteAsset(assetData), ["negative"])),
                        GenericTemplates.notSaved(isUpdate, notSaved, notSaveable, () => {
                            data.value = initialData;
                        }, () => {
                            loading.value = true;
                            onSubmit(data.value, () => {
                                loading.value = false;
                                if (isModal) {
                                    closeModal();
                                }
                            });
                        }),
                        ifjs(loading, GenericTemplates.spinner()),
                    ).build(),
                ifjs(isUpdate, create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.buttonWithIcon("switch_access_shortcut_add", "Create set with asset", () => {
                            newSet({
                                setName: `${assetData.manufacturer} ${assetData.model} set`,
                                assets: [assetData as Asset]
                            })
                        }),
                        GenericTemplates.buttonWithIcon("content_copy", "Copy ID", () => {
                            navigator.clipboard.writeText(assetData.id);
                        })
                    ).build())
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
                create("div")
                    .classes("flex", "align-center", "search-header")
                    .children(
                        create("span")
                            .text("Assets")
                            .build(),
                        create("div")
                            .classes("flex", "align-center")
                            .children(
                                GenericTemplates.input(InputType.text, "search", search, "Search", null, "search", ["full-width", "search-input"], (value: string) => search.value = value),
                            ).build(),
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
                                            .text("Serial")
                                            .build(),
                                        create("th")
                                            .text("Stock")
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
                        GenericTemplates.input(InputType.text, "filter", search, "Filter", null, "filter", ["full-width", "search-input"], (value: string) => search.value = value),
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
        return create("tr")
            .children(
                create("td")
                    .children(GenericTemplates.itemName(itemFromAsset(asset)))
                    .build(),
                create("td")
                    .text(asset.serialNumber)
                    .build(),
                create("td")
                    .text(asset.count)
                    .build(),
                create("td")
                    .children(
                        GenericTemplates.quantityChanger(asset.id, true, asset.quantity, asset.count, onQuantityChange),
                    ).build(),
                create("td")
                    .children(
                        GenericTemplates.buttonWithIcon("delete", "Remove", () => {
                            onRemoveAsset(asset);
                        }, ["negative"]),
                    ).build(),
            ).build();
    }

    static assetCard(selectedAsset: Signal<Asset>, selectedAssetId: Signal<string>) {
        const form = compute(asset => {
            return AssetTemplates.assetForm(asset, "Edit asset", getUpdateAssetMethod(asset, selectedAssetId), false);
        }, selectedAsset);

        return create("div")
            .classes("flex-v", "bordered-panel", "flex-grow")
            .children(form)
            .build();
    }
}