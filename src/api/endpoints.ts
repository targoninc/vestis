import {Asset} from "../models/Asset";
import {Tag} from "../models/Tag";
import {AssetSet} from "../models/AssetSet";
import {Job} from "../models/Job";
import {CLI} from "./CLI";
import {DB} from "./db";
import {Application} from "express";
import {AssetManagerDB} from "./assetManagerDb";

export function createEndpoints(app: Application, db: DB) {
    app.post('/assets', async (req, res) => {
        const asset = req.body as Asset;
        CLI.log(`Creating asset ${asset.manufacturer}/${asset.model}`);
        try {
            const id = await AssetManagerDB.insertAsset(db, asset);
            res.status(201).send({ id });
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.get('/assets', async (req, res) => {
        CLI.log(`Getting assets`);
        try {
            const assets = await AssetManagerDB.getAssets(db);
            res.status(200).send(assets);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.get('/assets/:identifier', async (req, res) => {
        const identifier = req.params.identifier;
        CLI.log(`Getting asset ${identifier}`);

        try {
            const asset = await AssetManagerDB.getAsset(db, identifier);
            if (!asset) {
                 res.status(404).send('Asset not found');
                 return;
            }
            res.status(200).send(asset);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.delete('/assets/:identifier', async (req, res) => {
        const identifier = req.params.identifier;
        CLI.log(`Deleting asset ${identifier}`);
        try {
            await AssetManagerDB.deleteAsset(db, identifier);
        } catch (err: any) {
            res.status(500).send(err.message);
            return;
        }
        res.status(200).send('Asset deleted');
    });

    app.put('/assets/:identifier', async (req, res) => {
        const identifier = req.params.identifier;
        CLI.log(`Updating asset ${identifier}`);
        const assetData = req.body;

        try {
            await AssetManagerDB.updateAsset(db, assetData, identifier);
            res.status(200).send('Asset updated');
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.get('/tags', async (req, res) => {
        const { id, name } = req.query;
        CLI.log(`Getting tags`);
        const tags = await AssetManagerDB.getTags(db, id as string, name as string);
        res.status(200).send(tags);
    });

    app.post('/tags', async (req, res) => {
        const { id, name }: Tag = req.body;
        CLI.log(`Creating tag ${name}`);
        await AssetManagerDB.createTag(db, id, name);
        res.status(201).send({ id, name });
    });

    app.delete('/tags/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Deleting tag ${id}`);
        await AssetManagerDB.deleteTag(db, id);
        res.status(204).send();
    });

    app.get('/sets', async (req, res) => {
        CLI.log(`Getting sets`);
        const sets = await AssetManagerDB.getSets(db);
        res.status(200).send(sets);
    });

    app.post('/sets', async (req, res) => {
        const { setName, assets }: AssetSet = req.body;
        CLI.log(`Creating set ${setName}`);
        const id = await AssetManagerDB.createSet(db, setName, assets);
        res.status(201).send({ id });
    });

    app.put('/sets/:id', async (req, res) => {
        const {id} = req.params;
        CLI.log(`Updating set ${id}`);
        const setData = req.body;

        try {
            await AssetManagerDB.updateSet(db, id, setData);
            res.status(200).send('Set updated');
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.delete('/sets/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Deleting set ${id}`);
        await AssetManagerDB.deleteSet(db, id);
        res.status(204).send();
    });

    app.get('/sets/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Getting set ${id}`);
        const set = await AssetManagerDB.getSet(db, id);
        if (!set) {
            res.status(404).send('Set not found');
            return;
        }
        res.status(200).send(set);
    });

    app.post('/jobs', async (req, res) => {
        const job: Job = req.body;
        CLI.log(`Creating job ${job.jobNumber}/${job.name}`);
        const id = await AssetManagerDB.createJob(db, job);
        res.status(201).send({ id });
    });

    app.get('/jobs', async (req, res) => {
        CLI.log(`Getting jobs`);
        const jobs = await AssetManagerDB.getJobs(db);
        res.status(200).send(jobs);
    });

    app.get('/jobs/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Getting job ${id}`);
        const job = await AssetManagerDB.getJob(db, id);
        if (!job) {
            res.status(404).send('Job not found');
            return;
        }
        res.status(200).send(job);
    });

    app.put('/jobs/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Updating job ${id}`);

        try {
            await AssetManagerDB.updateJob(db, id, req.body);
            res.status(200).send('Job updated');
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    app.delete('/jobs/:id', async (req, res) => {
        const { id } = req.params;
        CLI.log(`Deleting job ${id}`);
        await AssetManagerDB.deleteJob(db, id);
        res.status(204).send();
    });
}
