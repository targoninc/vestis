import {Template} from "@pdfme/common";
import {getDynamicHeightsForTable} from '@pdfme/schemas/utils';

export const MM_TO_PT_RATIO = 2.8346;

export interface TableSchemaConfig {
    name: string;
    headers: string[];
    showHead?: boolean;
    width: number;
    position: {
        x: number;
        y: number;
    }
    font?: string;
    fontSize?: number;
    cellPadding?: number;
    borders?: {
        top?: boolean;
        right?: boolean;
        bottom?: boolean;
        left?: boolean;
    },
    transparent?: boolean;
}

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
        head: config.headers,
        headWidthPercentages: config.headers?.map(() => 100 / config.headers.length),
        tableStyles: {
            borderWidth: 0,
            borderColor: black
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
            }
        },
        columnStyles: {},
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