import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './lib/query-client';
import './styles/tokens.css';
import './styles/global.css';
import './styles/grid.css';
import App from './App.tsx';

const basename = import.meta.env.BASE_URL;

// Handle 404 redirect
const params = new URLSearchParams(location.search);
const redirect = params.get('redirect');
if (redirect) {
  history.replaceState(null, '', import.meta.env.BASE_URL + redirect);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
