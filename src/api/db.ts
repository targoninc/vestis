import {Database} from "sqlite3";
import {initializeTables, insertDefaultTags} from "./defaultValues";

const sqlite3 = require('sqlite3').verbose();

export class DB {
    private db: Database;

    constructor(db_path: string) {
        this.db = this.startDb(db_path);
    }

    startDb(db_path: string) {
        const db = new sqlite3.Database(db_path ?? ':memory:');

        db.serialize(() => {
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

    async getAsync<T>(query: string, params: any[] = [], errorCallback = (_: any) => {
    }): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, function (err, rows: T[]) {
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
}