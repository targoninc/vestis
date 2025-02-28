import {Template} from "@pdfme/common";
import {tableSchema} from "./table";
import {getMmByPercentageOf} from "../helpers";
import {pageA4} from "../pageSizes";
import {TranslationKey} from "../../i8n/translationKey";
import {t} from "../../i8n/translation";
import {TextAlignment} from "../textAlignment";

export interface DeliveryNoteInput {
    jobInfo: string[][];
    jobItems: string[][];
}

export const paddingPercentage = (2 * 100 * pageA4.padding[0] / pageA4.width);
const fullWidth = getMmByPercentageOf(pageA4.width, 100 - paddingPercentage);
const left = pageA4.padding[3];

export function jobInfoSchema(y: number): Template {
    return tableSchema({
        name: "jobInfo",
        width: fullWidth,
        headers: [{
            name: "Property",
            alignment: TextAlignment.left,
            sizeInPercent: 25
        }, {
            name: "Value",
            alignment: TextAlignment.left,
            sizeInPercent: 75
        }],
        showHead: false,
        transparent: true,
        position: {
            x: left,
            y
        },
    });
}

export function jobItemsSchema(y: number): Template {
    return tableSchema({
        name: "jobItems",
        headers: [
            {
                name: t(TranslationKey.amount),
                alignment: TextAlignment.left,
                sizeInPercent: 10,
            },
            {
                name: t(TranslationKey.item),
                alignment: TextAlignment.left,
                sizeInPercent: 80,
            },
            {
                name: t(TranslationKey.days),
                alignment: TextAlignment.right,
                sizeInPercent: 10,
            },
        ],
        width: fullWidth,
        position: {
            x: left,
            y
        },
        borders: {
            bottom: true
        }
    });
}

const top = pageA4.padding[0];
export const itemGap = 5;

export const deliveryNote = {
    basePdf: pageA4,
    schemas: [
        [
            {
                name: "title",
                type: "text",
                position: {
                    x: left,
                    y: top
                },
                fontSize: 20,
                font: "Arial Bold",
                content: t(TranslationKey.deliveryNote),
                width: fullWidth,
                height: 1,
                verticalAlignment: "top",
                required: false,
                readOnly: true
            },
            jobInfoSchema(top + itemGap * 2),
            jobItemsSchema(top + itemGap * 3)
        ],
    ],
}