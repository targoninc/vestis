import {Template} from "@pdfme/common";
import {tableSchema} from "./table";
import {getMmByPercentageOf} from "../helpers";
import {pageA4} from "../pageSizes";

export interface DeliveryNoteInput {
    jobInfo: string[][];
    jobItems: string[][];
}

export const paddingPercentage = (2 * 100 * pageA4.padding[0] / pageA4.width);
const fullWidth = getMmByPercentageOf(pageA4.width, 100 - paddingPercentage);
const left = pageA4.padding[3];

export const deliveryNote: Template = {
    basePdf: pageA4,
    schemas: [
        [
            tableSchema({
                name: "jobInfo",
                width: fullWidth,
                headers: ["Property", "Value"],
                showHead: false,
                transparent: true,
                position: {
                    x: left,
                    y: 30
                },
            }),
            tableSchema({
                name: "jobItems",
                headers: ["Count", "Item"],
                width: fullWidth,
                position: {
                    x: left,
                    y: 50
                },
                borders: {
                    bottom: true
                }
            })
        ],
    ],
}