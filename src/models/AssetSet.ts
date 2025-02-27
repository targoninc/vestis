import {Asset} from "./Asset";

export interface AssetSet extends Record<string, any> {
    id: string;
    basedOnId?: string;
    jobId?: string;
    setName: string;
    createdAt: Date;
    updatedAt: Date;
    quantity?: number;
    assets?: Asset[];
}