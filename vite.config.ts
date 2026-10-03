import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          } else if (
            id.includes('src/pages/platform/') ||
            id.includes('src/pages/billing/') ||
            id.includes('src/pages/invoices/') ||
            id.includes('src/pages/payments/') ||
            id.includes('src/pages/receipts/') ||
            id.includes('src/pages/fee-schedules/')
          ) {
            return 'domain-platform-billing';
          } else if (id.includes('src/pages/imaging/')) {
            return 'domain-imaging';
          } else if (id.includes('src/pages/inventory/')) {
            return 'domain-inventory';
          } else if (
            id.includes('src/pages/packages/') ||
            id.includes('src/pages/wallets/') ||
            id.includes('src/pages/memberships/')
          ) {
            return 'domain-packages';
          }
        },
      },
    },
  },
});
