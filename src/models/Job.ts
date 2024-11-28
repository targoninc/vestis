import {Asset} from "./Asset";
import {AssetSet} from "./AssetSet";

export interface Job {
    id: string;
    jobNumber: number;
    customerId: string;
    contact: string;
    name: string;
    startTime: string;
    endTime: string;
    dayCount: number;
    disposition: number;
    createdAt: string;
    updatedAt: string;
    assets?: Asset[];
    sets?: AssetSet[];
}