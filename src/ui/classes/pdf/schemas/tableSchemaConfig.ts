import {TextAlignment} from "../textAlignment";

export interface TableHeader {
    name: string;
    sizeInPercent?: number;
    alignment?: TextAlignment;
}

export interface TableSchemaConfig {
    name: string;
    headers: TableHeader[];
    showHead?: boolean;
    width: number;
    position: {
        x: number;
        y: number;
    }
    font?: string;
    fontSize?: number;
    cellPadding?: number;
    borders?: {
        top?: boolean;
        right?: boolean;
        bottom?: boolean;
        left?: boolean;
    },
    transparent?: boolean;
}