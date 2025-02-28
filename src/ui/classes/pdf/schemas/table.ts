import {Template} from "@pdfme/common";
import {getDynamicHeightsForTable} from '@pdfme/schemas/utils';
import {TableSchemaConfig} from "./tableSchemaConfig";
import {TextAlignment} from "../textAlignment";

const defaultCellPadding = .5;
const defaultFontSize = 10;
const defaultFont = "Arial";
const defaultBoldFont = "Arial Bold";
const borderWidth = 0.1;

const white = "#ffffff";
const black = "#000000";

export function tableSchema(config: TableSchemaConfig): Template {
    return {
        name: config.name,
        type: "table",
        position: config.position,
        width: config.width,
        height: 1,
        showHead: config.showHead ?? true,
        head: config.headers.map(h => h.name),
        headWidthPercentages: config.headers?.map((h) => h.sizeInPercent ?? (100 / config.headers.length)),
        tableStyles: {
            borderWidth: 0,
            borderColor: black
        },
        columnStyles: {
            alignment: config.headers.reduce((a, b, i) => {
                a[i.toString()] = b.alignment ?? TextAlignment.left;
                return a;
            }, {})
        },
        headStyles: {
            fontName: config.font ?? defaultBoldFont,
            fontSize: config.fontSize ?? defaultFontSize,
            characterSpacing: 0,
            alignment: "left",
            verticalAlignment: "middle",
            lineHeight: 1,
            fontColor: black,
            borderColor: config.transparent ? white : "#888888",
            backgroundColor: config.transparent ? white : "#eeeeee",
            borderWidth: {
                top: config.borders?.top ? borderWidth : 0,
                right: config.borders?.right ? borderWidth : 0,
                bottom: config.borders?.bottom ? borderWidth : 0,
                left: config.borders?.left ? borderWidth : 0,
            },
            padding: {
                top: config.cellPadding ?? defaultCellPadding,
                right: config.cellPadding ?? defaultCellPadding,
                bottom: config.cellPadding ?? defaultCellPadding,
                left: config.cellPadding ?? defaultCellPadding
            }
        },
        bodyStyles: {
            fontName: config.font ?? defaultFont,
            fontSize: config.fontSize ?? defaultFontSize,
            characterSpacing: 0,
            alignment: "left",
            verticalAlignment: "middle",
            lineHeight: 1,
            fontColor: black,
            borderColor: config.transparent ? white : "#888888",
            backgroundColor: config.transparent ? white : "",
            borderWidth: {
                top: config.borders?.top ? borderWidth : 0,
                right: config.borders?.right ? borderWidth : 0,
                bottom: config.borders?.bottom ? borderWidth : 0,
                left: config.borders?.left ? borderWidth : 0,
            },
            padding: {
                top: config.cellPadding ?? defaultCellPadding,
                right: config.cellPadding ?? defaultCellPadding,
                bottom: config.cellPadding ?? defaultCellPadding,
                left: config.cellPadding ?? defaultCellPadding
            },
        },
        required: false,
        readOnly: false
    };
}

export async function getTableHeight(input: string[][], schema: Template) {
    const heights = await getDynamicHeightsForTable(input, {
        schema: schema,
        options: {},
        _cache: new Map()
    }) as number[];
    return heights.reduce((a, b) => a + b, 0);
}