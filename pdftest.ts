import {barcodes, image, table, text} from '@pdfme/schemas';
import {generate} from "@pdfme/generator";
import fs from "fs";
import path from 'path';
import {exec} from "node:child_process";
import {deliveryNote, DeliveryNoteInput} from "./src/pdf/schemas/deliveryNote";

const plugins = {
    Text: text,
    'QR Code': barcodes.qrcode,
    Image: image,
    Table: table,
};

const inputs: DeliveryNoteInput = {
    jobInfo: [
        ["Produktion:", `"Agentur Imagefilm - Angebot"`],
        ["VorgangsNr.:", "000001"],
        ["", ""],
        ["Projektleitung:", "Max Mustermann"],
        ["Dispo:", "Alice Anderson"],
        ["Ladetag:", "25.02.2025"],
        ["Prod.-Zeitraum:", "26.02.2025 - 01.03.2025"],
        ["Rückladetag:", "02.03.2025"],
    ],
    jobItems: [
        ["1", "+ ARRI Alexa Mini LF SET"],
        ["1", "  - ARRI Alexa Mini LF"],
        ["1", "  - ARRI PL > LPL Adapter"],
    ],
};

generate({
    template: deliveryNote,
    inputs: [inputs],
    plugins
}).then((pdf) => {
    fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);

    exec("test.pdf");
});