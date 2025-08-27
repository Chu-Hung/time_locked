import { ConfigProvider, theme } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SolanaProvider } from './components/providers/wallet.provider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
      }}
    >
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </ConfigProvider>
  </StrictMode>,
);
