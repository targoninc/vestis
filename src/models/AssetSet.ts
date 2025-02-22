import {Asset} from "./Asset";

export interface AssetSet extends Record<string, any> {
    id: string;
    setName: string;
    createdAt: Date;
    updatedAt: Date;
    assets?: Asset[];
}