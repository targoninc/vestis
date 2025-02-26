import {Template} from '@pdfme/common';
import {barcodes, image, table, text} from '@pdfme/schemas';
import {generate} from "@pdfme/generator";
import {tableSchema} from "./src/pdf/schemas/table";
import {pageA4} from "./src/pdf/pageSizes";
import fs from "fs";
import path from 'path';

const template: Template = {
    schemas: [
        [
            tableSchema({
                name: "test",
                headers: ["One", "Two", "Three"],
            })
        ],
    ],
    basePdf: pageA4,
};

const plugins = {
    Text: text,
    'QR Code': barcodes.qrcode,
    Image: image,
    Table: table,
};

const inputs = [
    {
        test: [
            ["test", "test2", "test3"],
        ],
    },
];

generate({template, inputs, plugins}).then((pdf) => {
    fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);
});