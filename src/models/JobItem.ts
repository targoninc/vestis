import {Asset} from "./Asset";
import {AssetSet} from "./AssetSet";

export interface JobItem {
    type: "asset" | "set";
    id: string;
    name: string;
    quantity: number;
    maxQuantity: number;
    asset?: Asset;
    set?: AssetSet;
    content?: Asset[];
}