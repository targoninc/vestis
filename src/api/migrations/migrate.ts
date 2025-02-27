import fs from "fs";
import {CLI} from "../CLI";

async function executeStatement(db: any, statement: string, sql: string) {
    if (statement.trim().length > 0) {
        CLI.log(`Running DB update: ${statement.trim()}`);
        try {
            await db.run(sql);
        } catch (err: any) {
            if (err.toString().includes("duplicate")) {
                return;
            }
            CLI.error(`Error running DB update: ${err.message}`);
        }
    }
}

export async function migrate(db: any) {
    const folder = process.cwd() + '/src/api/migrations';
    const files = fs.readdirSync(folder);

    for (const file of files) {
        if (file.endsWith('.sql')) {
            const sql = fs.readFileSync(folder + '/' + file, 'utf8');
            const statements = sql.split(';');
            for (const statement of statements) {
                await executeStatement(db, statement, sql);
            }
        }
    }
}