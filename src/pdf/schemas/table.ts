import {Template} from "@pdfme/common";

export interface TableSchemaConfig {
    name: string;
    headers: string[];
    font?: string;
    fontSize?: number;
    cellPadding?: number;
}

const defaultCellPadding = 5;
const defaultFontSize = 13;
const defaultFont = "Arial";

export function tableSchema(config: TableSchemaConfig): Template {
    return {
        name: config.name,
        type: "table",
        position: {
            "x": 28.92,
            "y": 51.36
        },
        width: 150,
        height: 57.5184,
        showHead: true,
        head: config.headers,
        headWidthPercentages: config.headers.map(() => 100 / config.headers.length),
        tableStyles: {
            borderWidth: 0.3,
            borderColor: "#000000"
        },
        headStyles: {
            fontName: config.font ?? defaultFont,
            fontSize: config.fontSize ?? defaultFontSize,
            characterSpacing: 0,
            alignment: "left",
            verticalAlignment: "middle",
            lineHeight: 1,
            fontColor: "#000000",
            borderColor: "#888888",
            backgroundColor: "#eeeeee",
            borderWidth: {
                top: 0.1,
                right: 0.1,
                bottom: 0.1,
                left: 0.1
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
            fontColor: "#000000",
            borderColor: "#888888",
            backgroundColor: "",
            alternateBackgroundColor: "#f5f5f5",
            borderWidth: {
                top: 0.1,
                right: 0.1,
                bottom: 0.1,
                left: 0.1
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