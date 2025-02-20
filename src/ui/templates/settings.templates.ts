import {create, nullElement} from "../lib/fjsc/src/f2";
import {compute, Signal} from "../lib/fjsc/src/signals";
import {GenericTemplates} from "./generic.templates";
import {Api} from "../classes/api";
import {configuration} from "../classes/store";
import {SettingsConfiguration} from "./settingsConfiguration";
import {InputType} from "../lib/fjsc/src/Types";
import {defaultConfig} from "../enums/DefaultConfig";

export class SettingsTemplates {
    static settings(activePage: Signal<string>) {
        const settings: SettingsConfiguration[] = [
            {
                key: "db_path",
                icon: "database",
                label: "Database path",
                description: "The path to the database file. If you change this, move the file first, then update the path.",
                type: "string",
            },
            {
                key: "display_hotkeys",
                icon: "keyboard",
                label: "Display hotkeys",
                description: "Whether to display hotkeys in the UI.",
                type: "boolean",
            },
        ];

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Settings")
                    .build(),
                settings.map(s => SettingsTemplates.setting(s))
            ).build();
    }

    static setting(sc: SettingsConfiguration) {
        const updateKey = async (key: string, value: any) => {
            configuration.value = {
                ...configuration.value,
                [key]: value,
            };
            await Api.setConfigKey(key, value);
        };
        const value = compute(c => c[sc.key] ?? defaultConfig[sc.key], configuration);

        return create("div")
            .classes("flex")
            .children(
                create("h2")
                    .children(
                        GenericTemplates.icon(sc.icon)
                    ).build(),
                create("div")
                    .classes("flex-v", "panel")
                    .children(
                        SettingsTemplates.settingImplementation(sc, value, updateKey),
                        create("p")
                            .text(sc.description)
                            .build()
                    ).build()
            ).build();
    }

    private static settingImplementation(sc: SettingsConfiguration, value: Signal<any>, updateKey: (key: string, value: any) => Promise<void>) {
        switch (sc.type) {
            case "string":
                return GenericTemplates.input(InputType.text, sc.key, value, sc.label, sc.label, sc.key, [], (newValue) => updateKey(sc.key, newValue));
            case "number":
                return GenericTemplates.input(InputType.number, sc.key, value, sc.label, sc.label, sc.key, [], (newValue: string) => updateKey(sc.key, parseInt(newValue)));
            case "boolean":
                return GenericTemplates.toggle(sc.label, value, val => updateKey(sc.key, val));
            default:
                return nullElement();
        }
    }
}
