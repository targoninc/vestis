import {Tag} from "./Tag";

export interface AssetTag {
    asset_id: string;
    tag_id: string;
    tag?: Tag[];
}