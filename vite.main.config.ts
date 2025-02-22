import {externalizeDepsPlugin} from 'electron-vite';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [externalizeDepsPlugin()],
});