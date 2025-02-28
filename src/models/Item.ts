import {Asset} from "./Asset";

export interface Item<T = any> {
    type: "asset" | "set" | "job";
    id: string;
    name: string;
    dayCount: number|null;
    quantity: number;
    maxQuantity: number;
    entity?: T;
    content?: Asset[];
}