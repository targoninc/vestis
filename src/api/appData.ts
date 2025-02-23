import path from "path";

const userDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local');
export const appDataPath = path.join(userDataPath, 'vestis');