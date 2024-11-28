export interface AssetType {
    name: string;
    icon: string;
    id: string;
}

export const AssetTypes: Record<string, AssetType> = {
    camera: {
        name: "Camera",
        icon: "camera",
        id: "camera",
    },
    video: {
        name: "Video",
        icon: "videocam",
        id: "video",
    },
    sound: {
        name: "Sound",
        icon: "audiotrack",
        id: "sound",
    },
    light: {
        name: "Light",
        icon: "lightbulb",
        id: "light",
    },
    grip: {
        name: "Grip",
        icon: "gamepad",
        id: "grip",
    },
    quantity: {
        name: "Quantity",
        icon: "category",
        id: "quantity",
    },
    other: {
        name: "Other",
        icon: "more_horiz",
        id: "other",
    },
}

export type Callback<Args extends unknown[]> = (...args: Args) => void;

export function target(e: Event) {
    return e.target as HTMLInputElement;
}