import {Tag} from "./Tag";

export interface Asset extends Record<string, any> {
    id: string;
    type: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    uniqueString: string;
    isDeleted: number;
    priceInCents: number;
    description: string;
    count: number;
    createdAt: Date;
    updatedAt: Date;
    dayRateFactor: number;
    dayRate: number;
    quantity?: number;
    tags?: Tag[];
}