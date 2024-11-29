import {Asset} from "../models/Asset";
import {DB} from "./db";

export class AssetManagerDB {
    static async insertAsset(db: DB, asset: Asset) {
        const INSERT_ASSET_QUERY = `INSERT INTO assets (id, type, manufacturer, model, serialNumber, isUnique, uniqueString, isDeleted, count, priceInCents, dayRate, description)
                                      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`;

        const { id, type, manufacturer, model, serialNumber, isUnique, uniqueString, count, priceInCents, description, tags }: Asset = asset;
        await db.runAsync(INSERT_ASSET_QUERY, [id, type, manufacturer, model, serialNumber, isUnique, uniqueString, count, priceInCents, description]);

        const INSERT_TAG_QUERY = `INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT DO NOTHING`;
        const ASSOCIATE_TAG_QUERY = `INSERT INTO assets_tags (asset_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`;
        for (let tag of tags) {
            await db.runAsync(INSERT_TAG_QUERY, [tag.id, tag.name]);
            await db.runAsync(ASSOCIATE_TAG_QUERY, [id, tag.id]);
        }
    }
}