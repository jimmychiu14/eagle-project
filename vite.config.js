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
            },
            '/finmind': {
                target: 'https://api.finmindtrade.com',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/finmind/, ''); }
            },
            '/twse': {
                target: 'https://openapi.twse.com.tw',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/twse/, ''); }
            }
        }
    }
});
