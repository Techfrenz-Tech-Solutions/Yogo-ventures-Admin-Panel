// // vite.config.js
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';

// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: { '@': path.resolve(__dirname, './src') },
//   },
//   server: {
//     port: 5173,
//     proxy: {
//       '/api': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//       },
//     },
//   },
//   build: {
//     outDir: 'dist',
//     sourcemap: false,
//     chunkSizeWarningLimit: 1000,
//     rollupOptions: {
//       output: {
//         manualChunks: {
//           vendor: ['react', 'react-dom', 'react-router-dom'],
//           charts: ['recharts'],
//           utils: ['axios', 'date-fns'],
//         },
//       },
//     },
//   },
// });


// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,

    proxy: {
      '/api': {
        target: 'http://192.168.0.20:7002', // actual backend
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // strips /api prefix before forwarding
      },
    },

    // Uncomment and update if HMR doesn't work via ngrok
    // hmr: {
    //   protocol: 'wss',
    //   host: 'your-ngrok-domain.ngrok-free.app',
    //   clientPort: 443,
    // },
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          charts: ['recharts'],
          utils: [
            'axios',
            'date-fns',
          ],
        },
      },
    },
  },
});