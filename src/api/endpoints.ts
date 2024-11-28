import { v4 as uuidv4 } from 'uuid';
import {Application} from "express";
import {Database} from "sqlite3";
import {Asset} from "../models/Asset";
import {Tag} from "../models/Tag";
import {AssetSet} from "../models/AssetSet";
import {Job} from "../models/Job";
import {CLI} from "./CLI";

export function createEndpoints(app: Application, db: Database) {
    const INSERT_ASSET_QUERY = `INSERT INTO assets (id, type, manufacturer, model, serialNumber, isUnique, uniqueString, isDeleted, count, priceInCents, dayRate, description)
                                      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`;
    const UPDATE_ASSET_QUERY = `UPDATE assets SET type = ?, manufacturer = ?, model = ?, serialNumber = ?, isUnique = ?,
                                      uniqueString = ?, count = ?, priceInCents = ?, dayRate = ?, description = ? WHERE id = ? OR uniqueString = ?`;
    const INSERT_TAG_QUERY = `INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT DO NOTHING`;
    const ASSOCIATE_TAG_QUERY = `INSERT INTO assets_tags (asset_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`;
    const GET_ALL_ASSETS_QUERY = `SELECT * FROM assets WHERE isDeleted = 0`;
    const GET_ASSET_TAGS_QUERY = `SELECT * FROM tags WHERE id IN (SELECT tag_id FROM assets_tags WHERE asset_id = ?)`;

    function dbRunAsync(query: string, params: any[] = [], errorCallback = (_: any) => {}) {
        return new Promise((resolve, reject) => {
            db.run(query, params, function (err: any) {
                if (err) {
                    if (errorCallback) {
                        errorCallback(err);
                    }
                    return reject(err);
                }
                resolve(this);
            });
        });
    }

    function dbGetAsync<T>(query: string, params: any[] = [], errorCallback = (_: any) => {}): Promise<T[]> {
        return new Promise((resolve, reject) => {
            db.all(query, params, function (err, rows: T[]) {
                if (err) {
                    if (errorCallback) {
                        errorCallback(err);
                    }
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    app.post('/assets', async (req, res) => {
        const { type, manufacturer, model, serialNumber, isUnique, uniqueString, count, priceInCents, description, tags }: Asset = req.body;
        CLI.log(`Creating asset ${manufacturer}/${model}`);
        const id = uuidv4();
        try {
            await dbRunAsync(INSERT_ASSET_QUERY,
                [id, type, manufacturer, model, serialNumber, isUnique, uniqueString, count, priceInCents, description]);

            for (let tag of tags) {
                await dbRunAsync(INSERT_TAG_QUERY, [tag.id, tag.name]);
                await dbRunAsync(ASSOCIATE_TAG_QUERY, [id, tag.id]);
            }

            res.status(201).send({ id });
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.get('/assets', async (req, res) => {
        CLI.log(`Getting assets`);
        try {
            const assets = await dbGetAsync<Asset>(GET_ALL_ASSETS_QUERY);

            for (let asset of assets) {
                asset.tags = await dbGetAsync<Tag>(GET_ASSET_TAGS_QUERY, [asset.id]);
            }
            res.status(200).send(assets);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    const GET_ASSET_QUERY = `SELECT * FROM assets WHERE isDeleted = 0 AND (id = ? OR uniqueString = ?)`;
    app.get('/assets/:identifier', async (req, res) => {
        const identifier = req.params.identifier;
        CLI.log(`Getting asset ${identifier}`);

        try {
            const assets = await dbGetAsync<Asset>(GET_ASSET_QUERY, [identifier, identifier]);
            if (!assets) {
                return res.status(404).send('Asset not found');
            }

            const asset = assets[0];
            asset.tags = await dbGetAsync<Tag>(GET_ASSET_TAGS_QUERY, [identifier]);
            res.status(200).send(asset);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.delete('/assets/:identifier', (req, res) => {
        const identifier = req.params.identifier;
        CLI.log(`Deleting asset ${identifier}`);
        db.run(`
        UPDATE assets SET isDeleted = 1 WHERE id = ? OR uniqueString = ?`,
            [identifier, identifier],
            function(err: any) {
                if (err) {
                    return res.status(500).send(err.message);
                }
                if (this.changes === 0) {
                    return res.status(404).send('Asset not found');
                }
                res.status(200).send('Asset deleted');
            }
        );
    });

    app.put('/assets/:identifier', async (req, res) => {
        const identifier = req.params.identifier;
        CLI.log(`Updating asset ${identifier}`);
        const assetData = req.body;

        try {
            await dbRunAsync(UPDATE_ASSET_QUERY,
                [assetData.type, assetData.manufacturer, assetData.model, assetData.serialNumber, assetData.isUnique,
                    assetData.uniqueString, assetData.count, assetData.priceInCents, assetData.dayRate, assetData.description, identifier, identifier]);

            await dbRunAsync(`DELETE FROM assets_tags WHERE asset_id = ?`, [identifier]);
            for (let tag of assetData.tags) {
                await dbRunAsync(INSERT_TAG_QUERY, [tag.id, tag.name]);
                await dbRunAsync(ASSOCIATE_TAG_QUERY, [identifier, tag.id]);
            }

            res.status(200).send('Asset updated');
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.get('/tags', (req, res) => {
        const { id, name } = req.query;
        CLI.log(`Getting tags`);
        if (!id && !name) {
            db.all(`
                SELECT * FROM tags`,
                (err, rows) => {
                    if (err) {
                        return res.status(500).send(err.message);
                    }
                    res.status(200).send(rows);
                }
            );
        } else {
            db.all(`
                SELECT * FROM tags WHERE id LIKE ? OR name LIKE ?`,
                [id, name],
                (err, rows) => {
                    if (err) {
                        return res.status(500).send(err.message);
                    }
                    res.status(200).send(rows);
                }
            );
        }
    });

    app.post('/tags', (req, res) => {
        const { id, name }: Tag = req.body;
        CLI.log(`Creating tag ${name}`);
        db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [id, name], function (err) {
            if (err) {
                res.status(500).json({error: err.message});
                return;
            }
            res.status(201).json({id, name});
        });
    });

    app.delete('/tags/:id', (req, res) => {
        const { id } = req.params;
        CLI.log(`Deleting tag ${id}`);
        db.run('DELETE FROM tags WHERE id = ?', [id], function (err) {
            if (err) {
                res.status(500).json({error: err.message});
                return;
            }
            res.status(204).send();
        });
    });

    app.get('/sets', async (req, res) => {
        CLI.log(`Getting sets`);
        const sets = await dbGetAsync<AssetSet>('SELECT * FROM sets ORDER BY createdAt DESC');

        for (let set of sets) {
            set.assets = await dbGetAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
        }
        res.status(200).send(sets);
    });

    app.post('/sets', async (req, res) => {
        const { setName, assets }: AssetSet = req.body;
        CLI.log(`Creating set ${setName}`);
        const id = uuidv4();
        await dbRunAsync('INSERT INTO sets (id, setName) VALUES (?, ?)', [id, setName]);

        for (let asset of assets) {
            await dbRunAsync('INSERT INTO sets_assets (set_id, asset_id) VALUES (?, ?)', [id, asset.id]);
        }

        res.status(201).send({ id });
    });

    app.put('/sets/:id', async (req, res) => {
        const {id} = req.params;
        CLI.log(`Updating set ${id}`);
        const setData = req.body;

        try {
            await dbRunAsync('UPDATE sets SET setName = ? WHERE id = ?', [setData.setName, id]);

            await dbRunAsync('DELETE FROM sets_assets WHERE set_id = ?', [id]);
            for (let asset of setData.assets) {
                await dbRunAsync('INSERT INTO sets_assets (set_id, asset_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, asset.id]);
            }

            res.status(200).send('Set updated');
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.delete('/sets/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Deleting set ${id}`);
        await dbRunAsync('DELETE FROM sets WHERE id = ?', [id]);
        res.status(204).send();
    });

    app.get('/sets/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Getting set ${id}`);
        const sets = await dbGetAsync<AssetSet>('SELECT * FROM sets WHERE id = ?', [id]);
        if (!sets) {
            return res.status(404).send('Set not found');
        }
        const set = sets[0];
        console.log(sets);

        set.assets = await dbGetAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
        res.status(200).send(sets);
    });

    app.post('/jobs', async (req, res) => {
        const { jobNumber, name, customerId, contact, startTime, endTime, dayCount, disposition, assets, sets }: Job = req.body;
        CLI.log(`Creating job ${jobNumber}/${name}`);
        const id = uuidv4();
        await dbRunAsync('INSERT INTO jobs (id, jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, jobNumber, customerId, contact, name, startTime, endTime, dayCount, disposition]);

        for (let asset of assets) {
            await dbRunAsync('INSERT INTO jobs_assets (job_id, asset_id) VALUES (?, ?)', [id, asset.id]);
        }

        for (let set of sets) {
            await dbRunAsync('INSERT INTO jobs_sets (job_id, set_id) VALUES (?, ?)', [id, set.id]);
        }

        res.status(201).send({ id });
    });

    app.get('/jobs', async (req, res) => {
        CLI.log(`Getting jobs`);
        const jobs = await dbGetAsync<Job>('SELECT * FROM jobs');

        for (let job of jobs) {
            job.assets = await dbGetAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM jobs_assets WHERE job_id = ?)', [job.id]);
            job.sets = await dbGetAsync('SELECT * FROM sets WHERE id IN (SELECT set_id FROM jobs_sets WHERE job_id = ?)', [job.id]);

            // I know this isn't performant. It works.
            for (let set of job.sets) {
                set.assets = await dbGetAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
            }
        }
        res.status(200).send(jobs);
    });

    app.get('/jobs/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Getting job ${id}`);
        const jobs = await dbGetAsync<Job>('SELECT * FROM jobs WHERE id = ?', [id]);
        if (!jobs || jobs.length === 0) {
            return res.status(404).send('Job not found');
        }
        const job = jobs[0];
        job.assets = await dbGetAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM jobs_assets WHERE job_id = ?)', [job.id]);
        job.sets = await dbGetAsync('SELECT * FROM sets WHERE id IN (SELECT set_id FROM jobs_sets WHERE job_id = ?)', [job.id]);
        for (let set of job.sets) {
            set.assets = await dbGetAsync('SELECT * FROM assets WHERE id IN (SELECT asset_id FROM sets_assets WHERE set_id = ?)', [set.id]);
        }
        res.status(200).send(job);
    });

    app.put('/jobs/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Updating job ${id}`);
        const jobData = req.body;

        try {
            await dbRunAsync('UPDATE jobs SET jobNumber = ?, customerId = ?, contact = ?, name = ?, startTime = ?, endTime = ?, dayCount = ?, disposition = ? WHERE id = ?', [jobData.jobNumber, jobData.customerId, jobData.contact, jobData.name, jobData.startTime, jobData.endTime, jobData.dayCount, jobData.disposition, id]);

            await dbRunAsync('DELETE FROM jobs_assets WHERE job_id = ?', [id]);
            for (let asset of jobData.assets) {
                await dbRunAsync('INSERT INTO jobs_assets (job_id, asset_id) VALUES (?, ?)', [id, asset.id]);
            }

            await dbRunAsync('DELETE FROM jobs_sets WHERE job_id = ?', [id]);
            for (let set of jobData.sets) {
                await dbRunAsync('INSERT INTO jobs_sets (job_id, set_id) VALUES (?, ?)', [id, set.id]);
            }

            res.status(200).send('Job updated');
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.delete('/jobs/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Deleting job ${id}`);
        await dbRunAsync('DELETE FROM jobs WHERE id = ?', [id]);
        res.status(204).send();
    });
}
