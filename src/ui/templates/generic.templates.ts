import {closeModal, newId} from "../classes/ui.js";
import {createPriceFromCents, parsePrice} from "../classes/currency.js";
import {InputType} from "node:zlib";
import {AnyNode, create, ifjs, signalMap, StringOrSignal, TypeOrSignal} from "../lib/fjsc/src/f2";
import {compute, Signal, signal} from "../lib/fjsc/src/signals";
import {Tag} from "../../models/Tag";
import {Callback, target} from "../classes/types";
import {ColoredTag} from "../../models/uiExtensions/ColoredTag";
import {tagList} from "../classes/store";

export class GenericTemplates {
    static input<T>(type: InputType, name: string, value: any, placeholder: StringOrSignal, label: StringOrSignal, id: any, classes: StringOrSignal[] = [],
                 onchange: Callback<[T]> = () => {}, oninput: Callback<[Event]> = () => {}, attributes: StringOrSignal[] = [], required = false) {
        const validate = () => {
            const el = document.getElementById(id) as HTMLInputElement;
            if (el.required) {
                if (!el.value || el.value === "") {
                    el.classList.add("invalid");
                    el.title = `${label} is required`;
                } else {
                    el.classList.remove("invalid");
                    el.title = label;
                }
            }
        }

        const input = create("input")
            .type(type)
            .name(name)
            .value(value)
            .placeholder(placeholder)
            .id(id)
            .attributes(...attributes)
            .onchange(e => {
                if (type === "checkbox") {
                    onchange(target(e).checked as unknown as T);
                    return;
                }
                onchange(target(e).value as unknown as T);
            })
            .onclick(e => {
                if (type === "datetime-local") {
                    // @ts-ignore
                    e.currentTarget.showPicker();
                }
            })
            .onkeydown(e => {
                validate();
            })
            .oninput(e => {
                validate();
                oninput(e);
            });

        if (required) {
            input.attributes("required", "true");
            setTimeout(validate, 100);
        }

        if (type === "checkbox") {
            input.attributes("checked", value ? "true" : "false");
        }

        const labelAddition = required ? '*' : '';
        const labelClass = type === "checkbox" ? "flex" : "flex-v";

        return create("label")
            .classes("flex-v", ...classes, required ? "required" : "_")
            .for(name)
            .text(label + labelAddition)
            .children(
                create("div")
                    .classes(labelClass)
                    .children(
                        input.build(),
                        ifjs(type === "checkbox", create("span").text(placeholder).build()),
                    ).build(),
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

    static buttonWithIcon(icon: StringOrSignal, text: StringOrSignal, onclick: Callback<[]>, classes: StringOrSignal[] = [], iconClasses: StringOrSignal[] = []) {
        return create("button")
            .classes("flex", ...classes)
            .onclick(onclick)
            .children(
                GenericTemplates.icon(icon, iconClasses),
                ifjs(text, create("span")
                    .text(text)
                    .build()),
            ).build();
    }

    static infoText(icon: StringOrSignal, text: StringOrSignal, classes: StringOrSignal[] = [], iconClasses: StringOrSignal[] = []) {
        return create("div")
            .classes("flex", "info-pill", ...classes)
            .children(
                ifjs(icon, GenericTemplates.icon(icon, iconClasses)),
                ifjs(text, create("span")
                    .text(text)
                    .build()),
            ).build();
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
                })
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

    static collapsible(text: StringOrSignal, content: AnyNode|AnyNode[], classes: StringOrSignal[] = [], open = false) {
        const uniqueId = newId();
        const toggled = signal(open);
        const iconClass = compute(on => on ? "rot90" : "rot0", toggled);
        let contentElement;

        contentElement = create("div")
            .classes("collapsible-content")
            .id(uniqueId)
            .children(content)
            .build();

        const details = create("details")
            .classes("collapsible", "flex-v", ...classes)
            .children(
                create("summary")
                    .classes("collapsible-header", "flex", "align-center")
                    .onclick(() => {
                        toggled.value = !toggled.value;
                    })
                    .children(
                        GenericTemplates.icon("expand_circle_right", [iconClass]),
                        create("span")
                            .classes("collapsible-title")
                            .text(text)
                            .build()
                    ).build(),
                contentElement
            ).build() as HTMLDetailsElement;
        if (open) {
            details.open = true;
        }
        return details;
    }

    static textArea(value: any, label: StringOrSignal, id: StringOrSignal, oninput: Callback<[string]>) {
        return create("label")
            .classes("flex-v", "full-width")
            .for(id)
            .children(
                ifjs(label, create("span")
                    .text(label)
                    .build()),
                create("textarea")
                    .classes("full-width")
                    .name(id)
                    .id(id)
                    .oninput((e) => {
                        oninput(target(e).value);
                    })
                    .value(value)
                    .build()
            ).build();
    }

    static toggle(text: StringOrSignal, checked: TypeOrSignal<boolean> = false, callback: Callback<[boolean]> = () => {
    }, extraClasses: StringOrSignal[] = [], id: StringOrSignal = null) {
        return create("label")
            .classes("flex-v", ...extraClasses)
            .for(id)
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
            .classes("tag")
            .styles("background-color", actualColor)
            .onclick(() => {
                clickCallback(value);
            })
            .children(
                create("span")
                    .text(value.name)
                    .build(),
                ifjs(clickCallback, GenericTemplates.icon("close")),
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

    static tableListHeader(headerName: string, propertyName: string, activeSortHeader: Signal<string>, listSignal: Signal<any[]>) {
        const currentSortType = signal("desc");
        const headerNameFull = signal(headerName);
        const getHeaderNameFull = () => {
            if (activeSortHeader.value && activeSortHeader.value === propertyName) {
                headerNameFull.value = `${headerName} ${currentSortType.value === "asc" ? "▲" : "▼"}`;
            } else {
                headerNameFull.value = headerName;
            }
        }
        activeSortHeader.subscribe(getHeaderNameFull);
        currentSortType.subscribe(getHeaderNameFull);
        getHeaderNameFull();

        return create("th")
            .text(headerNameFull)
            .onclick(() => {
                activeSortHeader.value = propertyName;
                if (currentSortType.value === "asc") {
                    currentSortType.value = "desc";
                } else {
                    currentSortType.value = "asc";
                }
                listSignal.value = listSignal.value.sort((a, b) => {
                    if (currentSortType.value === "asc") {
                        if (!a[propertyName] || !b[propertyName]) {
                            return 0;
                        }
                        if (a[propertyName].constructor === String) {
                            return a[propertyName].localeCompare(b[propertyName]);
                        } else {
                            return a[propertyName] - b[propertyName];
                        }
                    } else {
                        if (!b[propertyName] || !a[propertyName]) {
                            return 0;
                        }
                        if (a[propertyName].constructor === String) {
                            return b[propertyName].localeCompare(a[propertyName]);
                        } else {
                            return b[propertyName] - a[propertyName];
                        }
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

    static tabs(tabs: Array<StringOrSignal>, tabNames: Signal<string[]>, activeTab: Signal<number>) {
        if (tabNames.constructor !== Signal) {
            tabNames = signal(tabNames as unknown as string[]) as Signal<string[]>;
        }

        const tabButtons = signalMap<string>(tabNames, create("div").classes("flex", "align-center", "no-gap"), tabName => {
            const active = compute(activeTab => activeTab === tabNames.value.indexOf(tabName), activeTab);
            const activeClass = compute((active): string => active ? "active" : "_", active);

            return GenericTemplates.tabButton(tabName, active, () => {
                activeTab.value = activeTab.value === tabNames.value.indexOf(tabName) ? -1 : tabNames.value.indexOf(tabName);
            }, [activeClass]);
        });

        return create("div")
            .classes("flex-v", "fit-width")
            .children(
                tabButtons,
                ...tabs.map((tab, i) => {
                    const active = compute(activeTab => activeTab === i, activeTab);
                    return ifjs(active, tab);
                })
            ).build();
    }

    static tabButton(tabName: StringOrSignal, active: Signal<boolean>, onClick: Callback<[]>, classes: StringOrSignal[] = []) {
        return create("div")
            .classes("flex", "align-center", "tab-button", ...classes)
            .onclick(onClick)
            .children(
                create("span")
                    .text(tabName)
                    .build(),
            ).build();
    }

    static priceDisplay(priceInCents: Signal<number>, label: StringOrSignal, classes: StringOrSignal[] = []) {
        if (priceInCents.constructor === Number) {
            priceInCents = signal(priceInCents);
        }
        const price = compute(priceInCents => createPriceFromCents(priceInCents), priceInCents);

        return create("label")
            .classes("flex-v", ...classes)
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