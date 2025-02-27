import {Asset} from "../models/Asset";
import {DB} from "./db";
import {Tag} from "../models/Tag";
import {AssetSet} from "../models/AssetSet";
import {v4 as uuidv4} from "uuid";
import {Job} from "../models/Job";

const GET_ASSET_TAGS_QUERY = `SELECT *
                              FROM tags
                              WHERE id IN (SELECT tag_id FROM assets_tags WHERE asset_id = ?)`;
const INSERT_TAG_QUERY = `INSERT INTO tags (id, name)
                          VALUES (?, ?)
                          ON CONFLICT DO NOTHING`;
const ASSOCIATE_TAG_QUERY = `INSERT INTO assets_tags (asset_id, tag_id)
                             VALUES (?, ?)
                             ON CONFLICT DO NOTHING`;

export class AssetManagerDB {
    static async insertAsset(db: DB, asset: Asset) {
        const INSERT_ASSET_QUERY = `INSERT INTO assets (id, type, manufacturer, model, serialNumber,
                                                        uniqueString, isDeleted, count, priceInCents, dayRate,
                                                        description, weightInGrams)
                                    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`;

        const id = uuidv4();
        const {
            type, manufacturer, model, serialNumber, uniqueString,
            count, priceInCents, description, dayRate, tags, weightInGrams
        }: Asset = asset;
        await db.runAsync(INSERT_ASSET_QUERY, [id, type, manufacturer, model, serialNumber, uniqueString, count, priceInCents, dayRate, description, weightInGrams]);

        for (const tag of tags) {
            await db.runAsync(INSERT_TAG_QUERY, [tag.id, tag.name]);
            await db.runAsync(ASSOCIATE_TAG_QUERY, [id, tag.id]);
        }
        return id;
    }

    static async getAssets(db: DB) {
        const GET_ALL_ASSETS_QUERY = `SELECT *
                                      FROM assets
                                      WHERE isDeleted = 0`;
        const assets = await db.getAsync<Asset>(GET_ALL_ASSETS_QUERY);

        for (const asset of assets) {
            asset.tags = await db.getAsync<Tag>(GET_ASSET_TAGS_QUERY, [asset.id]);
        }

        return assets;
    }

    static async getAsset(db: DB, identifier: string) {
        const GET_ASSET_QUERY = `SELECT *
                                 FROM assets
                                 WHERE isDeleted = 0
                                   AND (id = ? OR uniqueString = ?)`;
        const assets = await db.getAsync<Asset>(GET_ASSET_QUERY, [identifier, identifier]);
        if (!assets) {
            return null;
        }

        const asset = assets[0];
        asset.tags = await db.getAsync<Tag>(GET_ASSET_TAGS_QUERY, [identifier]);
        return asset;
    }

    static async deleteAsset(db: DB, identifier: string) {
        const DELETE_ASSET_QUERY = `DELETE
                                    FROM assets
                                    WHERE id = ?
                                       OR uniqueString = ?`;
        await db.runAsync(DELETE_ASSET_QUERY, [identifier, identifier]);
    }

    static async updateAsset(db: DB, asset: Asset, identifier: string) {
        const UPDATE_ASSET_QUERY = `UPDATE assets
                                    SET type = ?,
                                        manufacturer = ?,
                                        model = ?,
                                        serialNumber = ?,
                                        uniqueString = ?,
                                        count = ?,
                                        priceInCents = ?,
                                        dayRateFactor = ?,
                                        dayRate = ?,
                                        description = ?,
                                        weightInGrams = ?
                                    WHERE id = ?
                                       OR uniqueString = ?`;
        await db.runAsync(UPDATE_ASSET_QUERY,
            [asset.type, asset.manufacturer, asset.model, asset.serialNumber,
                asset.uniqueString, asset.count, asset.priceInCents, asset.dayRateFactor,
                asset.dayRate, asset.description, asset.weightInGrams, identifier, identifier]);

        await db.runAsync(`DELETE FROM assets_tags WHERE asset_id = ?`, [identifier]);

        for (const tag of asset.tags) {
            await db.runAsync(INSERT_TAG_QUERY, [tag.id, tag.name]);
            await db.runAsync(ASSOCIATE_TAG_QUERY, [identifier, tag.id]);
        }
    }

    static async getTags(db: DB, id?: string, name?: string) {
        const GET_TAGS_QUERY = `SELECT * FROM tags`;

        id = id === '' ? null : id;
        name = name === '' ? null : name;

        if (!id && !name) {
            return db.getAsync<Tag>(GET_TAGS_QUERY, [id, name]);
        } else if (id) {
            return db.getAsync<Tag>(GET_TAGS_QUERY + " WHERE id = ?", [id]);
        } else if (name) {
            return db.getAsync<Tag>(GET_TAGS_QUERY + " WHERE name = ?", [name]);
        }
        return db.getAsync<Tag>(GET_TAGS_QUERY);
    }

    static async createTag(db: DB, id: string, name: string) {
        const INSERT_TAG_QUERY = `INSERT INTO tags (id, name) VALUES (?, ?)`;
        await db.runAsync(INSERT_TAG_QUERY, [id, name]);
    }

    static async deleteTag(db: DB, id: string) {
        const DELETE_TAG_QUERY = `DELETE FROM tags WHERE id = ?`;
        await db.runAsync(DELETE_TAG_QUERY, [id]);
    }

    static async getSets(db: DB) {
        const sets = await db.getAsync<AssetSet>(`SELECT * FROM sets
         WHERE basedOnId IS NULL
         ORDER BY createdAt DESC`);

        for (const set of sets) {
            set.assets = await this.getSetAssets(db, set.id);
        }

        return sets;
    }

    static async linkAssetToSet(db: DB, setId: string, assetId: string, quantity: number) {
        await db.runAsync('INSERT INTO sets_assets (set_id, asset_id, quantity) VALUES (?, ?, ?)', [setId, assetId, quantity]);
    }

    static async createSet(db: DB, setName: string, assets: Asset[]) {
        const id = uuidv4();
        await db.runAsync('INSERT INTO sets (id, setName) VALUES (?, ?)', [id, setName]);

        for (const asset of assets) {
            await AssetManagerDB.linkAssetToSet(db, id, asset.id, asset.quantity);
        }

        return id;
    }

    static async createDerivedSet(db: DB, setName: string, basedOnId: string, jobId: string, assets: Asset[]) {
        const id = uuidv4();
        await db.runAsync('INSERT INTO sets (id, setName, basedOnId, jobId) VALUES (?, ?, ?, ?)', [id, setName, basedOnId, jobId]);

        for (const asset of assets) {
            await AssetManagerDB.linkAssetToSet(db, id, asset.id, asset.quantity);
        }

        return id;
    }

    static async updateSet(db: DB, id: string, setData: AssetSet) {
        await db.runAsync('UPDATE sets SET setName = ? WHERE id = ?', [setData.setName, id]);

        await db.runAsync('DELETE FROM sets_assets WHERE set_id = ?', [id]);
        for (const asset of setData.assets) {
            await AssetManagerDB.linkAssetToSet(db, id, asset.id, asset.quantity);
        }
    }

    static async deleteSet(db: DB, id: string) {
        await db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
    }

    static async getSetAssets(db: DB, setId: string): Promise<Asset[]> {
        return await db.getAsync(`SELECT a.*, sa.quantity FROM assets AS a INNER JOIN sets_assets AS sa ON a.id = sa.asset_id
                                        WHERE sa.set_id = ? AND a.isDeleted = 0`, [setId]);
    }

    static async getJobSets(db: DB, jobId: string): Promise<AssetSet[]> {
        return await db.getAsync('SELECT s.*, js.quantity FROM sets AS s INNER JOIN jobs_sets AS js ON s.id = js.set_id WHERE js.job_id = ?', [jobId]);
    }

    static async getJobSet(db: DB, jobId: string, setId: string): Promise<AssetSet> {
        const sets = await db.getAsync<AssetSet>('SELECT s.*, js.quantity FROM sets AS s INNER JOIN jobs_sets AS js ON s.id = js.set_id WHERE js.job_id = ? AND s.id = ?', [jobId, setId]);
        if (!sets) {
            return null;
        }
        const set = sets[0];
        set.assets = await this.getSetAssets(db, set.id);
        return set;
    }

    static async getSet(db: DB, id: string) {
        const sets = await db.getAsync<AssetSet>('SELECT * FROM sets WHERE id = ?', [id]);
        if (!sets) {
            return null;
        }
        const set = sets[0];

        set.assets = await this.getSetAssets(db, set.id);
        return set;
    }

    static async linkSetToJob(db: DB, jobId: string, setId: string, quantity: number) {
        await db.runAsync('INSERT INTO jobs_sets (job_id, set_id, quantity) VALUES (?, ?, ?)', [jobId, setId, quantity]);
    }

    static async linkAssetToJob(db: DB, jobId: string, assetId: string, quantity: number) {
        await db.runAsync('INSERT INTO jobs_assets (job_id, asset_id, quantity) VALUES (?, ?, ?)', [jobId, assetId, quantity]);
    }

    static async createJob(db: DB, jobData: Job) {
        const {jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition, assets, sets} = jobData;
        const id = uuidv4();
        await db.runAsync('INSERT INTO jobs (id, jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition]);

        for (const asset of assets) {
            await AssetManagerDB.linkAssetToJob(db, id, asset.id, asset.quantity);
        }

        for (const set of sets) {
            const newSetId = await AssetManagerDB.createDerivedSet(db, set.setName, set.id, id, set.assets);
            await AssetManagerDB.linkSetToJob(db, id, newSetId, set.quantity);
        }

        return id;
    }

    static async getJobs(db: DB) {
        const jobs = await db.getAsync<Job>('SELECT * FROM jobs');

        for (const job of jobs) {
            job.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM jobs_assets WHERE job_id = ?)', [job.id]);
            job.sets = await this.getJobSets(db, job.id);

            for (const set of job.sets) {
                set.assets = await this.getSetAssets(db, set.id);
            }
        }
        return jobs;
    }

    static async getJob(db: DB, id: string) {
        const jobs = await db.getAsync<Job>('SELECT * FROM jobs WHERE id = ?', [id]);
        if (!jobs || jobs.length === 0) {
            return null;
        }
        const job = jobs[0];
        job.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM jobs_assets WHERE job_id = ?)', [job.id]);
        job.sets = await db.getAsync('SELECT * FROM sets WHERE id IN (SELECT set_id FROM jobs_sets WHERE job_id = ?)', [job.id]);
        for (const set of job.sets) {
            set.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
        }

        return job;
    }

    static async updateJob(db: DB, jobId: string, job: Job) {
        await db.runAsync('UPDATE jobs SET jobNumber = ?, customerId = ?, contact = ?, name = ?, startTime = ?, endTime = ?, dayCount = ?, disposition = ? WHERE id = ?',
            [job.jobNumber, job.customerId, job.contact, job.name, job.startTime, job.endTime, job.dayCount, job.disposition, jobId]);

        await db.runAsync('DELETE FROM jobs_assets WHERE job_id = ?', [jobId]);
        for (const asset of job.assets) {
            await AssetManagerDB.linkAssetToJob(db, jobId, asset.id, asset.quantity);
        }

        await db.runAsync('DELETE FROM jobs_sets WHERE job_id = ?', [jobId]);
        for (let set of job.sets) {
            if (!set.basedOnId || !set.jobId) {
                const newSetId = await AssetManagerDB.createDerivedSet(db, set.setName, set.id, jobId, set.assets);
                await AssetManagerDB.linkSetToJob(db, jobId, newSetId, set.quantity);
                set = await AssetManagerDB.getJobSet(db, jobId, newSetId);
            } else {
                await AssetManagerDB.linkSetToJob(db, jobId, set.id, set.quantity);
            }
        }
        const danglingSets = await AssetManagerDB.getDanglingJobSets(db, jobId);
        for (const set of danglingSets) {
            await AssetManagerDB.deleteSet(db, set.id);
        }
    }

    static async getDanglingJobSets(db: DB, jobId: string): Promise<{ id: string }[]> {
        return await db.getAsync('SELECT id FROM sets WHERE jobId = ? AND id NOT IN (SELECT set_id FROM jobs_sets WHERE job_id = ?)', [jobId, jobId]);

    }

    static async deleteJob(db: DB, id: string) {
        await db.runAsync('DELETE FROM jobs WHERE id = ?', [id]);
    }
}