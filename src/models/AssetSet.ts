import {Asset} from "./Asset";

export interface AssetSet {
    id: string;
    setName: string;
    createdAt: Date;
    updatedAt: Date;
    assets?: Asset[];
}