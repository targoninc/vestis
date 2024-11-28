import {BrowserWindow} from "electron";
import {StorageCache} from "./api/storagecache";
import {createEndpoints} from "./api/endpoints";
import {initializeTables, insertDefaultTags} from "./api/defaultValues";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

const sqlite3 = require('sqlite3').verbose();

dotenv.config();

function startDb() {
    const db = new sqlite3.Database(process.env.DB_PATH ?? ':memory:');

    db.serialize(() => {
        initializeTables(db);
        insertDefaultTags(db);

        console.log('DB started at ' + process.env.DB_PATH);
    });

    return db;
}

async function startServer(port: number = 48678) {
    try {
        const test = await fetch(`http://localhost:${port}`);
        if (test.status === 200) {
            console.log('Server already running on a different instance');
            return;
        }
    } catch (e) {
        console.log('Server not running, starting...');
    }

    const app = express();
    app.use(express.json());
    app.use(cors({
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204,
    }));
    app.get('/', (req, res) => {
        res.send('Hello World');
    });

    const db = startDb();
    createEndpoints(app, db);
    StorageCache.ensurePath();
    app.listen(port, () => {
        console.log("Server started");
    });
}

export function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        center: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: 'src/ui/assets/images/icon_1x.png',
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
    win.webContents.openDevTools();

    startServer().then();
}
