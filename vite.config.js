import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    base: '/eagle-project/',
    server: {
        proxy: {
            '/yahoo': {
                target: 'https://query1.finance.yahoo.com',
                changeOrigin: true,
                rewrite: function (path) { return path; }
            }
        }
    }
});
