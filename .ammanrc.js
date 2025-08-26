const { LOCALHOST, tmpLedgerDir } = require('@metaplex-foundation/amman');

module.exports = {
  validator: {
    killRunningValidators: true,
    accountsCluster: 'https://api.devnet.solana.com',
    accounts: [
      {
        label: 'Token Metadata Program',
        accountId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        executable: true,
      },
      {
        label: 'Token Auth Rules',
        accountId: 'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
        executable: true,
      },
      {
        label: 'Spl ATA Program',
        accountId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        executable: true,
      },
      {
        label: 'SPL Token Program',
        accountId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        executable: true,
      },
      {
        label: 'SPL Account Compression',
        accountId: 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK',
        executable: true,
      },
      {
        label: 'SPL Noop Program',
        accountId: 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV',
        executable: true,
      },
    ],
    jsonRpcUrl: LOCALHOST,
    websocketUrl: '',
    commitment: 'confirmed',
    ledgerDir: tmpLedgerDir(),
    resetLedger: true,
    verifyFees: false,
    detached: process.env.CI != null,
  },
  relay: {
    enabled: process.env.CI == null,
    killRunningRelay: true,
  },
  storage: {
    enabled: process.env.CI == null,
    storageId: 'mock-storage',
    clearOnStart: true,
  },
};
