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
    createdAt: string;
    updatedAt: string;
    dayRate: number;
    tags?: Tag[];
}