import {AssetTypes} from "./types";

export class DayRateCalculator {
    static getRateForType(type: keyof typeof AssetTypes) {
        switch (type) {
            case AssetTypes.grip.id:
                return 50;
            case AssetTypes.sound.id:
            case AssetTypes.light.id:
                return 40;
            case AssetTypes.camera.id:
                return 35;
            case AssetTypes.video.id:
                return 30;
            default:
                return 1;
        }
    }

    static calculateDayRate(dayRateFactor: number, priceInCents: number) {
        return Math.round((priceInCents / 100) / dayRateFactor) * 100;
    }
}