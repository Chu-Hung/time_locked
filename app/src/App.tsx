import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Galaxy from './components/ui/bg-galaxy';
import MyVaults from './my-vaults';

const App = () => {
  const wallet = useAnchorWallet();
  return (
    <main className='w-full h-screen bg-black text-white relative'>
      <div className='absolute inset-0 top-0 left-0 z-0'>
        <Galaxy
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.5}
          glowIntensity={0.6}
          saturation={0.8}
          hueShift={700}
        />
      </div>
      <div className='absolute inset-0 top-0 left-0 z-10 pointer-events-none'>
        <div className='w-full h-full flex items-center justify-center'>
          <div className='text-center space-y-4 w-1/3'>
            <h1 className='text-4xl font-bold text-white'>
              Solana Time Locked
            </h1>
            {wallet ? (
              <MyVaults />
            ) : (
              <WalletMultiButton className='pointer-events-auto' />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default App;
