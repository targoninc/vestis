import {Asset} from "./Asset";
import {AssetSet} from "./AssetSet";

export interface Job {
    id: string;
    jobNumber: string;
    customerId: string;
    contact: string;
    name: string;
    startTime: number;
    endTime: number;
    dayCount: number;
    disposition: number;
    createdAt: Date;
    updatedAt: Date;
    assets?: Asset[];
    sets?: AssetSet[];
}