import {LayoutTemplates} from "./templates/layout.templates";
import {toast} from "./classes/ui";
import {activePage, assetList, currentCheckout, initializeStore, scannerBuffer} from "./classes/store";
import {ToastType} from "./enums/ToastType";

import "../styles/reset.css";
import "../styles/index.css";
import "../styles/fonts.css";
import "../styles/classes.css";

initializeStore();

const content = document.getElementById('content');
const app = LayoutTemplates.app(activePage);
console.log(app);
content.appendChild(app);

const TIMEOUT = 50;
let lastKeydown = 0;

document.addEventListener("keydown", (e) => {
    let buffer = scannerBuffer.value;
    if (!isNaN(parseInt(e.key))) {
        if (Date.now() - lastKeydown > TIMEOUT) {
            buffer = "";
        }
        buffer += e.key;
        scannerBuffer.value = buffer;
        lastKeydown = Date.now();

        const asset = assetList.value.find(asset => asset.uniqueString === buffer);
        if (asset) {
            const existing = currentCheckout.value.assets.find(ass => ass.uniqueString === asset.uniqueString);
            if (existing) {
                if (existing.isUnique) {
                    toast("This asset is already in active checkout.", null, ToastType.negative);
                    return;
                }

                if (existing.quantity >= existing.count) {
                    toast("All available instances of this asset are already in active checkout.", null, ToastType.negative);
                    return;
                }
                currentCheckout.value = {
                    ...currentCheckout.value,
                    assets: currentCheckout.value.assets.map(asset => asset.uniqueString === asset.uniqueString ? {
                        ...asset,
                        quantity: existing.quantity + 1
                    } : asset)
                };
            } else {
                currentCheckout.value = {
                    ...currentCheckout.value,
                    assets: [
                        ...currentCheckout.value.assets,
                        {
                            ...asset,
                            quantity: 1
                        }
                    ]
                };
            }
            toast("Added asset to checkout.", null, ToastType.positive);
            scannerBuffer.value = "";
        }
    }
});