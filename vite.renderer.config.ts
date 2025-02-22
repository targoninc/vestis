import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Add this if you want to use absolute paths
      'ui': path.resolve(__dirname, './src/ui'),
      'styles': path.resolve(__dirname, './src/styles'),
    }
  },
  css: {
    // Add any CSS-specific configurations here
    modules: {
      localsConvention: 'camelCase'
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
});