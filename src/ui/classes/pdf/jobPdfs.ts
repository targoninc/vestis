import {barcodes, image, rectangle, table, text} from "@pdfme/schemas";
import {deliveryNote, DeliveryNoteInput} from "./schemas/deliveryNote";
import {t} from "../i8n/translation";
import {TranslationKey} from "../i8n/translationKey";
import {generate} from "@pdfme/generator";
import {Job} from "../../../models/Job";

const plugins = {
    Text: text,
    'QR Code': barcodes.qrcode,
    Image: image,
    Table: table,
    Rectangle: rectangle,
};

export async function deliveryNotePdf(job: Job) {
    const setPrefix = "+ ";
    const assetInSetPrefix = "  - ";
    const assetPrefix = "+ ";

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
            [`${t(TranslationKey.jobDayCount)}:`, job.dayCount + ` ${t(TranslationKey.days)}`],
        ],
        jobItems: [
            ...job.sets.flatMap(set => {
                const days = (set.days ?? job.dayCount).toString();

                return [
                    [set.quantity.toString(), setPrefix + set.setName, days],
                    ...set.assets.map(asset => {
                        const days = (set.days ?? job.dayCount).toString();

                        return [asset.quantity.toString(), assetInSetPrefix + asset.manufacturer + " " + asset.model, days];
                    })
                ]
            }),
            ...job.assets.map(asset => {
                const days = (asset.days ?? job.dayCount).toString();

                return [asset.quantity.toString(), assetPrefix + asset.manufacturer + " " + asset.model, days];
            })
        ],
    };

    return new Promise<Blob>((resolve) => {
        generate({
            template: deliveryNote,
            inputs: [inputs],
            plugins
        }).then((pdf) => {
            resolve(new Blob([pdf.buffer], { type: 'application/pdf' }));
        });
    });
}