import {closeModal} from "../classes/ui";
import {createPriceFromCents, parsePrice} from "../classes/currency";
import {InputType} from "node:zlib";
import {AnyElement, AnyNode, create, ifjs, signalMap, StringOrSignal, TypeOrSignal} from "../lib/fjsc/src/f2";
import {compute, Signal, signal} from "../lib/fjsc/src/signals";
import {Tag} from "../../models/Tag";
import {Callback, target} from "../classes/types";
import {ColoredTag} from "../../models/uiExtensions/ColoredTag";
import {configuration, tagList} from "../classes/store";
import {FJSC} from "../lib/fjsc";
import {Tab} from "../../models/uiExtensions/Tab";
import {Asset} from "../../models/Asset";

export class GenericTemplates {
    static input<T>(type: InputType, name: string, value: any, placeholder: StringOrSignal, label: StringOrSignal, id: any, classes: StringOrSignal[] = [],
                 onchange: Callback<[T]> = () => {}, attributes: StringOrSignal[] = [], required = false) {
        return FJSC.input<T>({
            type,
            name,
            value,
            placeholder,
            label,
            id,
            classes,
            onchange,
            attributes,
            required
        });
    }

    static typeIndicator(type: string, icon?: string) {
        return create("div")
            .classes("flex", "align-center", "type-indicator", type)
            .children(
                ifjs(icon, GenericTemplates.icon(icon)),
                create("span")
                    .text(type)
                    .build(),
            ).build();
    }

    static quantityChanger(id: string, allowChange: boolean|number, initialQuantity: number, maxQuantity: number, onQuantityChange: Callback<[string, number]>) {
        const quantity = signal(initialQuantity ?? 1);
        quantity.subscribe((newQuantity) => {
            onQuantityChange(id, newQuantity);
        });
        const removeClass = signal(quantity.value === 0 ? "disabled" : "_");
        const addClass = signal(quantity.value === maxQuantity ? "disabled" : "_");
        quantity.subscribe(q => {
            if (q === 0) {
                removeClass.value = "disabled";
                addClass.value = "disabled";
            } else if (q === maxQuantity) {
                removeClass.value = "disabled";
                addClass.value = "_";
            } else {
                removeClass.value = "_";
                addClass.value = "_";
            }
        });

        return create("div")
            .classes("flex", "align-center")
            .children(
                ifjs(allowChange, GenericTemplates.buttonWithIcon("remove", "", () => {
                    quantity.value = Math.max(0, quantity.value - 1);
                }, ["negative", removeClass]), true),
                ifjs(allowChange, GenericTemplates.buttonWithIcon("add", "", () => {
                    quantity.value = Math.min(maxQuantity, quantity.value + 1);
                }, ["positive", addClass]), true),
                create("span")
                    .text(quantity)
                    .build(),
            ).build();
    }

    static icon(icon: StringOrSignal, classes: StringOrSignal[] = [], title = "", tag = "span") {
        if (icon && (icon.constructor === String && (icon.includes(".") || icon.startsWith("data:image"))) || (icon.constructor === Signal && icon.value &&
            (icon.value.includes(".") || icon.value.startsWith("data:image")))) {
            return create("img")
                .classes("icon", ...classes)
                .src(icon)
                .title(title)
                .build();
        }

        return create(tag)
            .classes("material-symbols-outlined", ...classes)
            .text(icon)
            .title(title)
            .build();
    }

    static heading(level: number, text: StringOrSignal) {
        return create(`h${level}`)
            .text(text)
            .build();
    }

    static buttonWithIcon(icon: StringOrSignal, text: StringOrSignal, onclick: Callback<[]>, classes: StringOrSignal[] = [], iconClasses: StringOrSignal[] = [], hotkey: StringOrSignal = null) {
        return create("button")
            .classes("flex", ...classes)
            .onclick(onclick)
            .children(
                GenericTemplates.icon(icon, iconClasses),
                ifjs(text, create("span")
                    .text(text)
                    .build()),
                GenericTemplates.hotkey(hotkey),
            ).build();
    }

    static hotkey(hotkey: string, alwaysDisplay = false) {
        const show = compute(c => alwaysDisplay || (c.display_hotkeys === true && hotkey != null), configuration);

        return ifjs(show, create("kbd")
            .classes("hotkey")
            .text(hotkey)
            .build());
    }

    static spinner(circleCount = 4, delay = 0.2) {
        return create("div")
            .classes("spinner")
            .children(
                ...Array.from({length: circleCount}, (_, i) => {
                    return create("div")
                        .classes("spinner-circle")
                        .styles("animation-delay", `-${i * delay}s`)
                        .build();
                })
            ).build();
    }

    static select(label: string | null, options: Array<{ text: string; value: any; }>, value: any, onchange: (value: any) => void) {
        return create("div")
            .classes("flex", "align-center")
            .children(
                ifjs(label, create("span")
                    .text(label)
                    .build()),
                create("div")
                    .classes("select")
                    .children(
                        create("select")
                            .onchange((e) => {
                                onchange(target(e).value);
                            })
                            .children(
                                ...options.map(option => {
                                    const selected = compute(value => option.value === value, value);

                                    return create("option")
                                        .text(option.text)
                                        .value(option.value)
                                        .selected(selected)
                                        .onclick(() => {
                                            onchange(option.value);
                                        }).build();
                                })
                            ).build()
                    ).build()
            ).build();
    }

    static confirmModal(title: StringOrSignal, message: StringOrSignal, confirmText = "Confirm", cancelText = "Cancel",
                        confirmCallback = () => {}, cancelCallback = () => {}) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(title)
                    .build(),
                create("p")
                    .text(message)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.buttonWithIcon("check_circle", confirmText, () => {
                            confirmCallback();
                            closeModal();
                        }, ["positive"]),
                        GenericTemplates.buttonWithIcon("close", cancelText, () => {
                            cancelCallback();
                            closeModal();
                        }, ["negative"])
                    ).build()
            ).build();
    }

    static propertyList(object: any, classes: StringOrSignal[] = []) {
        const keys = Object.keys(object);
        return create("div")
            .classes("flex-v", "property-list", ...classes)
            .children(
                keys.map(key => {
                    let value = object[key];
                    if (value.constructor === Array) {
                        value = value.length + " items";
                    } else if (value.constructor === Object) {
                        value = value.length + " properties";
                    }

                    return GenericTemplates.property(key, value);
                })
            ).build();
    }

    static property(key: StringOrSignal, value: StringOrSignal) {
        return create("div")
            .classes("flex", "space-between", "property")
            .children(
                create("span")
                    .classes("property-key")
                    .text(key)
                    .build(),
                create("span")
                    .classes("property-value")
                    .text(value)
                    .build(),
            ).build();
    }

    static confirmModalWithContent(title: StringOrSignal, content: AnyNode|AnyNode[], confirmText = "Confirm", cancelText = "Cancel",
                                   confirmCallback = () => {}, cancelCallback = () => {}) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(title)
                    .build(),
                content,
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.buttonWithIcon("check_circle", confirmText, () => {
                            confirmCallback();
                            closeModal();
                        }, ["positive"]),
                        GenericTemplates.buttonWithIcon("close", cancelText, () => {
                            cancelCallback();
                            closeModal();
                        }, ["negative"])
                    ).build()
            ).build();
    }

    static textArea(value: any, label: StringOrSignal, id: StringOrSignal, oninput: Callback<[string]>) {
        return FJSC.textarea({
            classes: ["full-width"],
            value,
            label,
            id,
            onchange: oninput
        });
    }

    static toggle(text: StringOrSignal, checked: TypeOrSignal<boolean> = false, callback: Callback<[boolean]> = () => {
    }, extraClasses: StringOrSignal[] = [], id: StringOrSignal = null) {
        return FJSC.toggle({
            classes: [...extraClasses],
            text,
            checked,
            id,
            onchange: callback,
        });
    }

    static inlineToggle(text: StringOrSignal, checked = false, callback: Callback<[boolean]> = () => {}, extraClasses: StringOrSignal[] = [], id: StringOrSignal = null) {
        return create("label")
            .classes("flex", "align-center", "inline-toggle", ...extraClasses)
            .children(
                create("span")
                    .classes("toggle-text")
                    .text(text)
                    .build(),
                create("input")
                    .type("checkbox")
                    .classes("hidden", "slider")
                    .id(id)
                    .checked(checked)
                    .onclick(e => {
                        callback(target(e).checked);
                    })
                    .build(),
                create("div")
                    .classes("toggle-container", "align-center")
                    .children(
                        create("span")
                            .classes("toggle-slider")
                            .build()
                    ).build(),
            ).build();
    }

    static tagList(asset: Signal<{ tags: Tag[] }>, onChange: Callback<[Tag[]]> = () => {}) {
        const tags = compute(asset => asset.tags ?? [], asset);

        return create("div")
            .classes("flex", "flex-wrap")
            .children(
                GenericTemplates.tagInput(tags, tagList, onChange),
            ).build();
    }

    static tagInput(values: Signal<Tag[]>, options: Signal<Array<{ id: string; name: string; }>>, onChange: Callback<[Tag[]]> = () => {}) {
        const focused = signal(false);
        document.addEventListener("click", e => {
            const stayFocusedClassList = ["tag-input", "tag", "floating-option", "floating-options-list", "invisible-input"];
            focused.value = stayFocusedClassList.some(className => target(e).classList.contains(className));
        });
        const coloredOptions = compute(options => {
            return options.map((option, i) => {
                const colors = ["blue", "green", "red", "yellow", "purple", "teal", "magenta"];
                const color = colors[i % colors.length];
                return {
                    ...option,
                    color,
                } as ColoredTag;
            });
        }, options);
        const search = signal("");
        const filteredOptions = compute(values => {
            return coloredOptions.value.filter(option => !values.some(value => value.id === option.id));
        }, values);
        const searchFilteredOptions = compute(search => {
            if (search === "") {
                return filteredOptions.value;
            }
            return filteredOptions.value.filter(option => option.name.toLowerCase().includes(search.toLowerCase()));
        }, search);

        return create("div")
            .classes("tag-input")
            .children(
                signalMap<Tag>(values, create("div").classes("flex"), (value, index) => {
                    const optionColor = coloredOptions.value.find(option => option.id === value.id)?.color ?? "blue";

                    return GenericTemplates.tag(value, signal(optionColor), () => {
                        values.value = values.value.filter(v => v.id !== value.id);
                        onChange(values.value);
                    });
                }),
                GenericTemplates.invisibleInput(value => {
                    search.value = value;
                }, value => {
                    const id = value.toLowerCase().replaceAll(" ", "-");
                    if (!options.value.some(o => o.id === id)) {
                        options.value = [
                            ...options.value,
                            {
                                id,
                                name: value,
                            },
                        ];
                    }

                    if (!values.value.some(v => v.id === id)) {
                        values.value = [
                            ...values.value,
                            {
                                id,
                                name: value,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        ];
                    }
                    onChange(values.value);
                }),
                ifjs(focused, GenericTemplates.floatingOptionsList(searchFilteredOptions, option => {
                    values.value = [
                        ...values.value,
                        option
                    ];
                    onChange(values.value);
                })),
            ).build();
    }

    static tag(value: Tag, color: Signal<string>, clickCallback: Callback<[Tag]> = () => {}) {
        if (color.constructor === String) {
            color = signal(color);
        }
        const actualColor = compute(color => `var(--tag-${color})`, color);

        return create("div")
            .classes("tag", "flex")
            .styles("background-color", actualColor)
            .onclick(() => {
                clickCallback(value);
            })
            .children(
                create("span")
                    .text(value.name)
                    .build(),
                ifjs(clickCallback, create("div")
                    .classes("tag-icon")
                    .children(
                        GenericTemplates.icon("close")
                    ).build()),
            ).build();
    }

    static floatingOptionsList(options: Signal<ColoredTag[]>, clickCallback: Callback<[ColoredTag]> = () => {}) {
        const hasOptions = compute(options => options.length > 0, options);
        const listClass = compute((hasOptions): string => hasOptions ? "visible" : "hidden", hasOptions);

        return create("div")
            .classes("floating-options-list", listClass)
            .children(
                signalMap<ColoredTag>(options, create("div").classes("flex-v"), option => {
                    return create("div")
                        .classes("floating-option")
                        .styles("background-color", `var(--tag-${option.color})`)
                        .onclick(() => {
                            clickCallback(option);
                        })
                        .children(
                            create("span")
                                .classes("no-pointer-events")
                                .text(option.name)
                                .build(),
                            GenericTemplates.icon("add", ["no-pointer-events"]),
                        ).build();
                })
            ).build();
    }

    static tableListHeader(headerName: string, property: string|Function, activeSortHeader: Signal<string>, listSignal: Signal<any[]>) {
        const currentSortType = signal("desc");
        const headerNameFull = signal(headerName);
        const getHeaderNameFull = () => {
            if (activeSortHeader.value && activeSortHeader.value === headerName) {
                headerNameFull.value = `${headerName} ${currentSortType.value === "asc" ? "▲" : "▼"}`;
            } else {
                headerNameFull.value = headerName;
            }
        }
        activeSortHeader.subscribe(getHeaderNameFull);
        currentSortType.subscribe(getHeaderNameFull);
        getHeaderNameFull();

        return create("th")
            .classes("clickable")
            .text(headerNameFull)
            .onclick(() => {
                if (!property) {
                    return;
                }

                activeSortHeader.value = headerName;
                if (currentSortType.value === "asc") {
                    currentSortType.value = "desc";
                } else {
                    currentSortType.value = "asc";
                }
                listSignal.value = listSignal.value.sort((a, b) => {
                    if (property.constructor === String) {
                        let propA = a[property];
                        let propB = b[property];
                        if (property.includes(".")) {
                            propA = property.split(".").reduce((obj, key) => obj[key], a);
                            propB = property.split(".").reduce((obj, key) => obj[key], b);
                        }

                        if (currentSortType.value === "asc") {
                            if (!propA || !propB) {
                                return 0;
                            }
                            if (propA.constructor === String) {
                                return propA.localeCompare(propB);
                            } else {
                                return propA - propB;
                            }
                        } else {
                            if (!propB || !propA) {
                                return 0;
                            }
                            if (propA.constructor === String) {
                                return propB.localeCompare(propA);
                            } else {
                                return propB - propA;
                            }
                        }
                    } else if (property.constructor === Function) {
                        property = property as Function;
                        return property(a) - property(b);
                    }
                });
            })
            .build();
    }

    static invisibleInput(onType: Callback<[string]> = () => {}, onChange: Callback<[string]> = () => {}) {
        return create("input")
            .type("text")
            .classes("invisible-input")
            .onchange(e => {
                onChange(target(e).value);
                target(e).value = "";
            })
            .onkeydown((e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    target(e).value = "";
                    return;
                }

                if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
                    onChange(target(e).value);
                    target(e).value = "";
                    setTimeout(() => {
                        if (target(e).value === ",") {
                            target(e).value = "";
                        }
                        target(e).focus();
                    }, 0);
                    return;
                }

                setTimeout(() => {
                    onType(target(e).value);
                }, 0);
            })
            .build();
    }

    static error(error: StringOrSignal) {
        return create("div")
            .classes("error")
            .text(error)
            .build();
    }

    static priceInput(value: Signal<number>, label: string, onchange: Callback<[number]> = () => {}, classes: StringOrSignal[] = []) {
        const name = label.toLowerCase().replaceAll(" ", "-");
        const displayValue = compute(value => createPriceFromCents(value), value);

        return create("div")
            .classes("flex", "space-between", ...classes)
            .children(
                GenericTemplates.input<string>("text", name, displayValue, label, label, name, classes, (newValue) => {
                    onchange(parsePrice(newValue));
                }),
            ).build();
    }

    static tabs(tabs: Array<AnyElement>, tabDefs: Signal<Tab[]>, activeTab: Signal<string>) {
        const tabButtons = signalMap(tabDefs, create("div").classes("flex", "align-center", "no-gap"), (tabDef: Tab) => {
            const active = compute(activeTab => activeTab === tabDef.id, activeTab);

            return GenericTemplates.tabButton(tabDef, active, () => activeTab.value = tabDef.id);
        });

        return create("div")
            .classes("flex-v", "flex-grow")
            .children(
                tabButtons,
                create("div")
                    .classes("flex-v", "flex-grow", "main-panel", "bordered-panel")
                    .children(
                        ...tabs.map((tab, i) => {
                            const tabDef = tabDefs.value[i];
                            const active = compute(activeTab => activeTab === tabDef.id, activeTab);

                            return ifjs(active, tab);
                        })
                    ).build(),
            ).build();
    }

    static tabButton(tab: Tab, active: Signal<boolean>, onClick: Callback<[]>, classes: StringOrSignal[] = []) {
        const activeClass = compute((active): string => active ? "active" : "_", active);

        return create("div")
            .classes("flex", "align-center", "tab-button", activeClass, ...classes)
            .onclick(onClick)
            .children(
                ifjs(tab.icon, GenericTemplates.icon(tab.icon)),
                create("span")
                    .text(tab.name)
                    .build(),
                ifjs(tab.hotkey, GenericTemplates.hotkey(tab.hotkey)),
            ).build();
    }

    static priceDisplay(priceInCents: Signal<number>, label: StringOrSignal, classes: StringOrSignal[] = []) {
        if (priceInCents.constructor === Number) {
            priceInCents = signal(priceInCents);
        }
        const price = compute(priceInCents => createPriceFromCents(priceInCents), priceInCents);

        return create("label")
            .classes("flex-v", "fjsc", ...classes)
            .text(label)
            .children(
                create("span")
                    .classes("price-display")
                    .text(price)
                    .build()
            ).build();
    }

    static warning(warning: StringOrSignal) {
        return create("div")
            .classes("warning")
            .text(warning)
            .build();
    }

    static errorIndicator(errorCount: StringOrSignal) {
        return create("div")
            .classes("error-indicator")
            .text(errorCount)
            .build();
    }
}