import {HtmlPropertyValue} from "../../ui/lib/fjsc/src/f2";

export interface TextSegment {
    text: HtmlPropertyValue;
    type: "dark" | "light";
}