import sqlite3 from 'sqlite3';
import {Database, open} from "sqlite";
import {initializeTables, insertDefaultTags} from "./defaultValues";

export class DB {
    private readonly db_path: string;
    private db: Database;

    constructor(db_path: string) {
        this.db_path = db_path;
    }

    async init() {
        this.db = await this.startDb(this.db_path);
    }

    async startDb(db_path: string) {
        const db = await open({
            filename: db_path ?? ':memory:',
            driver: sqlite3.Database
        });

        db.getDatabaseInstance().serialize(() => {
            initializeTables(db);
            insertDefaultTags(db);

            console.log('DB started at ' + (db_path ?? ':memory:'));
        });

        return db;
    }

    async runAsync(query: string, params: any[] = [], errorCallback = (_: any) => {
    }) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (err: any) {
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

    async getAsync<T>(query: string, params: any[] = [], errorCallback = (_: any) => {}): Promise<T[]> {
        try {
            return await this.db.all(query, params);
        } catch (e) {
            if (errorCallback) {
                errorCallback(e);
            }
            return [];
        }
    }
}