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
        const INSERT_ASSET_QUERY = `INSERT INTO assets (id, type, manufacturer, model, serialNumber, isUnique,
                                                        uniqueString, isDeleted, count, priceInCents, dayRate,
                                                        description)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`;

        const id = uuidv4();
        const {
            type,
            manufacturer,
            model,
            serialNumber,
            isUnique,
            uniqueString,
            count,
            priceInCents,
            description,
            tags
        }: Asset = asset;
        await db.runAsync(INSERT_ASSET_QUERY, [id, type, manufacturer, model, serialNumber, isUnique, uniqueString, count, priceInCents, description]);

        for (let tag of tags) {
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

        for (let asset of assets) {
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
                                        isUnique = ?,
                                        uniqueString = ?,
                                        count = ?,
                                        priceInCents = ?,
                                        dayRate = ?,
                                        description = ?
                                    WHERE id = ?
                                       OR uniqueString = ?`;
        await db.runAsync(UPDATE_ASSET_QUERY,
            [asset.type, asset.manufacturer, asset.model, asset.serialNumber, asset.isUnique,
                asset.uniqueString, asset.count, asset.priceInCents, asset.dayRate, asset.description, identifier, identifier]);

        await db.runAsync(`DELETE
                           FROM assets_tags
                           WHERE asset_id = ?`, [identifier]);
        for (let tag of asset.tags) {
            await db.runAsync(INSERT_TAG_QUERY, [tag.id, tag.name]);
            await db.runAsync(ASSOCIATE_TAG_QUERY, [identifier, tag.id]);
        }
    }

    static async getTags(db: DB, id?: string, name?: string) {
        const GET_TAGS_QUERY = `SELECT *
                                FROM tags`;

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
        const INSERT_TAG_QUERY = `INSERT INTO tags (id, name)
                                  VALUES (?, ?)`;
        await db.runAsync(INSERT_TAG_QUERY, [id, name]);
    }

    static async deleteTag(db: DB, id: string) {
        const DELETE_TAG_QUERY = `DELETE
                                  FROM tags
                                  WHERE id = ?`;
        await db.runAsync(DELETE_TAG_QUERY, [id]);
    }

    static async getSets(db: DB) {
        const sets = await db.getAsync<AssetSet>('SELECT * FROM sets ORDER BY createdAt DESC');

        for (let set of sets) {
            set.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
        }

        return sets;
    }

    static async createSet(db: DB, setName: string, assets: Asset[]) {
        const id = uuidv4();
        await db.runAsync('INSERT INTO sets (id, setName) VALUES (?, ?)', [id, setName]);

        for (let asset of assets) {
            await db.runAsync('INSERT INTO sets_assets (set_id, asset_id) VALUES (?, ?)', [id, asset.id]);
        }

        return id;
    }

    static async updateSet(db: DB, id: string, setData: AssetSet) {
        await db.runAsync('UPDATE sets SET setName = ? WHERE id = ?', [setData.setName, id]);

        await db.runAsync('DELETE FROM sets_assets WHERE set_id = ?', [id]);
        for (let asset of setData.assets) {
            await db.runAsync('INSERT INTO sets_assets (set_id, asset_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, asset.id]);
        }
    }

    static async deleteSet(db: DB, id: string) {
        await db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
    }

    static async getSet(db: DB, id: string) {
        const sets = await db.getAsync<AssetSet>('SELECT * FROM sets WHERE id = ?', [id]);
        if (!sets) {
            return null;
        }
        const set = sets[0];

        set.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
        return set;
    }

    static async createJob(db: DB, jobData: Job) {
        const {jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition, assets, sets} = jobData;
        const id = uuidv4();
        await db.runAsync('INSERT INTO jobs (id, jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition]);

        for (let asset of assets) {
            await db.runAsync('INSERT INTO jobs_assets (job_id, asset_id) VALUES (?, ?)', [id, asset.id]);
        }

        for (let set of sets) {
            await db.runAsync('INSERT INTO jobs_sets (job_id, set_id) VALUES (?, ?)', [id, set.id]);
        }

        return id;
    }

    static async getJobs(db: DB) {
        const jobs = await db.getAsync<Job>('SELECT * FROM jobs');

        for (let job of jobs) {
            job.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM jobs_assets WHERE job_id = ?)', [job.id]);
            job.sets = await db.getAsync('SELECT * FROM sets WHERE id IN (SELECT set_id FROM jobs_sets WHERE job_id = ?)', [job.id]);

            // I know this isn't performant. It works.
            for (let set of job.sets) {
                set.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
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
        for (let set of job.sets) {
            set.assets = await db.getAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
        }

        return job;
    }

    static async updateJob(db: DB, id: string, job: Job) {
        await db.runAsync('UPDATE jobs SET jobNumber = ?, customerId = ?, contact = ?, name = ?, startTime = ?, endTime = ?, dayCount = ?, disposition = ? WHERE id = ?',
            [job.jobNumber, job.customerId, job.contact, job.name, job.startTime, job.endTime, job.dayCount, job.disposition, id]);

        await db.runAsync('DELETE FROM jobs_assets WHERE job_id = ?', [id]);
        for (let asset of job.assets) {
            await db.runAsync('INSERT INTO jobs_assets (job_id, asset_id) VALUES (?, ?)', [id, asset.id]);
        }

        await db.runAsync('DELETE FROM jobs_sets WHERE job_id = ?', [id]);
        for (let set of job.sets) {
            await db.runAsync('INSERT INTO jobs_sets (job_id, set_id) VALUES (?, ?)', [id, set.id]);
        }
    }

    static async deleteJob(db: DB, id: string) {
        await db.runAsync('DELETE FROM jobs WHERE id = ?', [id]);
    }
}