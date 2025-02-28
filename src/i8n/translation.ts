import {TranslationKey} from "./translationKey";
import {compute, signal} from "../ui/lib/fjsc/src/signals";
import {Languages} from "./languages";
import {de} from "./lang/de";
import {en} from "./lang/en";

export const language = signal(Languages.en);

const dicts: Record<Languages, Record<TranslationKey, string>> = {
    [Languages.de]: de,
    [Languages.en]: en
};

export function t$(key: TranslationKey) {
    return compute(l => dicts[l][key], language);
}

export function t(key: TranslationKey, language = Languages.en) {
    return dicts[language][key];
}
