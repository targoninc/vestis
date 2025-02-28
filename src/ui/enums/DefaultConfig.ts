import {Configuration} from "../../models/Configuration";
import {appDataPath} from "../../api/appData";

export const defaultConfig: Configuration = {
    db_path: `${appDataPath}/storage/db.sqlite`,
    last_page: 'home',
    display_hotkeys: true,
    username: "User",
    language: "en",
}