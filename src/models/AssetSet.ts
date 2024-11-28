import {Asset} from "./Asset";

export interface AssetSet {
    id: string;
    setName: string;
    createdAt: string;
    updatedAt: string;
    assets?: Asset[];
}