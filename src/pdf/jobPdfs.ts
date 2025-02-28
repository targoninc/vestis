import {barcodes, image, rectangle, table, text} from "@pdfme/schemas";
import {Job} from "../models/Job";
import {deliveryNote, DeliveryNoteInput} from "./schemas/deliveryNote";
import {t} from "../i8n/translation";
import {TranslationKey} from "../i8n/translationKey";
import {generate} from "@pdfme/generator";

const plugins = {
    Text: text,
    'QR Code': barcodes.qrcode,
    Image: image,
    Table: table,
    Rectangle: rectangle,
};

export async function getJobPdf(job: Job) {
    const setPrefix = "+ ";
    const assetInSetPrefix = "  - ";
    const assetPrefix = "+ ";
    const multiplier = "x";

    const startDate = new Date(job.startTime);
    const endDate = new Date(job.endTime);
    startDate.setDate(startDate.getDate() + 1);
    endDate.setDate(endDate.getDate() - 1);

    const inputs: DeliveryNoteInput = {
        jobInfo: [
            [`${t(TranslationKey.jobName)}:`, job.name],
            [`${t(TranslationKey.jobId)}:`, job.jobNumber],
            ["", ""],
            [`${t(TranslationKey.customerName)}:`, job.customerId],
            [`${t(TranslationKey.customerContact)}:`, job.contact],
            [`${t(TranslationKey.loadingDay)}:`, new Date(job.startTime).toLocaleDateString()],
            [`${t(TranslationKey.reloadingDay)}:`, new Date(job.endTime).toLocaleDateString()],
            [`${t(TranslationKey.dayCount)}:`, startDate.toLocaleDateString() + " - " + endDate.toLocaleDateString()],
        ],
        jobItems: [
            ...job.sets.flatMap(set => {
                const amount = (set.days ?? job.dayCount) + `d ${multiplier} ` + set.quantity.toString();

                return [
                    [amount, setPrefix + set.setName],
                    ...set.assets.map(asset => {
                        const amount = (set.days ?? job.dayCount) + `d ${multiplier} ` + asset.quantity.toString();

                        return [amount, assetInSetPrefix + asset.manufacturer + " " + asset.model];
                    })
                ]
            }),
            ...job.assets.map(asset => {
                const amount = (asset.days ?? job.dayCount) + `d ${multiplier} ` + asset.quantity.toString();

                return [amount, assetPrefix + asset.manufacturer + " " + asset.model];
            })
        ],
    };

    return new Promise<Blob>((resolve, reject) => {
        generate({
            template: deliveryNote,
            inputs: [inputs],
            plugins
        }).then((pdf) => {
            resolve(new Blob([pdf.buffer], { type: 'application/pdf' }));
        });
    });
}