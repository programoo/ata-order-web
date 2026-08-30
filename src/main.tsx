import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrdersPage } from './components/OrdersPage';
import './styles/app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // avoid surprise refetches while demoing
      staleTime: 30_000,
    },
  },
});

/**
 * The worker MUST be started and AWAITED before React renders.
 * If you render first, the very first request escapes to the real network
 * and 404s — a classic "my mocks don't work" bug that isn't a mock bug at all.
 *
 * The mock runs unless VITE_API_BASE_URL is set, so `npm run build` produces
 * a self-contained demo you can deploy anywhere. Point that env var at the
 * real Spring Boot service and the mock switches itself off — no code change.
 */
const USE_MOCKS = !import.meta.env.VITE_API_BASE_URL;

async function bootstrap() {
  if (USE_MOCKS) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <OrdersPage />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
