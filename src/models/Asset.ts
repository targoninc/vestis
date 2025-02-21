import {Tag} from "./Tag";

export interface Asset {
    id: string;
    type: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    isUnique: number;
    uniqueString: string;
    isDeleted: number;
    priceInCents: number;
    description: string;
    count: number;
    createdAt: Date;
    updatedAt: Date;
    dayRateFactor: number;
    dayRate: number;
    tags?: Tag[];
}