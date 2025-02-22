import {Tag} from "./Tag";

export interface AssetTag extends Record<string, any> {
    asset_id: string;
    tag_id: string;
    tag?: Tag[];
}