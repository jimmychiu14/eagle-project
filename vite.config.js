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
    server: {
        proxy: {
            '^/finmind/.*': {
                target: 'https://api.finmindtrade.com/api/v4/data',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/finmind/, ''); }
            }
        }
    }
});
