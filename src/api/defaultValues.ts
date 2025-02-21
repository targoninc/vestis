export function initializeTables(db: any) {
    db.run(`
        CREATE TABLE IF NOT EXISTS assets
        (
            id            TEXT PRIMARY KEY,
            type          TEXT,
            manufacturer  TEXT,
            model         TEXT,
            serialNumber  TEXT,
            isUnique      INTEGER,
            uniqueString  TEXT UNIQUE,
            isDeleted     INTEGER DEFAULT 0,
            priceInCents  INTEGER,
            dayRateFactor INTEGER,
            dayRate       INTEGER,
            description   TEXT,
            count         INTEGER,
            createdAt     TEXT DEFAULT (datetime('now')),
            updatedAt     TEXT DEFAULT (datetime('now'))
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tags
        (
            id       TEXT PRIMARY KEY,
            name     TEXT UNIQUE NOT NULL,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now'))
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS assets_tags
        (
            asset_id TEXT,
            tag_id   TEXT,
            PRIMARY KEY (asset_id, tag_id),
            FOREIGN KEY (asset_id) REFERENCES assets (id),
            FOREIGN KEY (tag_id) REFERENCES tags (id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sets
        (
            id       TEXT PRIMARY KEY,
            setName  TEXT,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now'))
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sets_assets
        (
            set_id    TEXT,
            asset_id  TEXT,
            quantity  INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (set_id, asset_id),
            FOREIGN KEY (set_id) REFERENCES sets(id),
            FOREIGN KEY (asset_id) REFERENCES assets(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS jobs
        (
            id         TEXT PRIMARY KEY,
            jobNumber  TEXT,
            customerId TEXT,
            contact    TEXT,
            name       TEXT,
            startTime  TEXT,
            endTime    TEXT,
            dayCount   INTEGER,
            disposition INTEGER DEFAULT 0,
            createdAt  TEXT DEFAULT (datetime('now')),
            updatedAt  TEXT DEFAULT (datetime('now'))
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS jobs_assets
        (
            job_id TEXT,
            asset_id TEXT,
            quantity  INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (job_id, asset_id),
            FOREIGN KEY (job_id) REFERENCES jobs(id),
            FOREIGN KEY (asset_id) REFERENCES assets(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS jobs_sets
        (
            job_id TEXT,
            set_id TEXT,
            quantity  INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (job_id, set_id),
            FOREIGN KEY (job_id) REFERENCES jobs(id),
            FOREIGN KEY (set_id) REFERENCES sets(id)
        );
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_assets
        AFTER UPDATE ON assets
        FOR EACH ROW
        BEGIN
            UPDATE assets SET updatedAt = datetime('now') WHERE id = OLD.id;
        END;
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_tags
        AFTER UPDATE ON tags
        FOR EACH ROW
        BEGIN
            UPDATE tags SET updatedAt = datetime('now') WHERE id = OLD.id;
        END;
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_assets_tags
        AFTER UPDATE ON assets_tags
        FOR EACH ROW
        BEGIN
            UPDATE assets_tags SET updatedAt = datetime('now') WHERE asset_id = OLD.asset_id AND tag_id = OLD.tag_id;
        END;
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_sets
        AFTER UPDATE ON sets
        FOR EACH ROW
        BEGIN
            UPDATE sets SET updatedAt = datetime('now') WHERE id = OLD.id;
        END;
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_sets_assets
        AFTER UPDATE ON sets_assets
        FOR EACH ROW
        BEGIN
            UPDATE sets_assets SET updatedAt = datetime('now') WHERE set_id = OLD.set_id AND asset_id = OLD.asset_id;
        END;
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_jobs
        AFTER UPDATE ON jobs
        FOR EACH ROW
        BEGIN
            UPDATE jobs SET updatedAt = datetime('now') WHERE id = OLD.id;
        END;
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_jobs_assets
        AFTER UPDATE ON jobs_assets
        FOR EACH ROW
        BEGIN
            UPDATE jobs_assets SET updatedAt = datetime('now') WHERE job_id = OLD.job_id AND asset_id = OLD.asset_id;
        END;
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS updated_jobs_sets
        AFTER UPDATE ON jobs_sets
        FOR EACH ROW
        BEGIN
            UPDATE jobs_sets SET updatedAt = datetime('now') WHERE job_id = OLD.job_id AND set_id = OLD.set_id;
        END;
    `);
}

export function insertDefaultTags(db: any) {
    db.run(`
        INSERT INTO tags (id, name) VALUES ('body', 'Body'), ('lens', 'Lens'), ('accessories', 'Accessories'), ('cable', 'Cable'), ('power', 'Power'), ('stand', 'Stand'), ('other', 'Other') ON CONFLICT DO NOTHING;
    `);
}