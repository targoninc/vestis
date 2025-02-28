export interface Configuration extends Record<string, any> {
    db_path: string;
    last_page: string;
    display_hotkeys: boolean;
    username: string;
    language: string;
}