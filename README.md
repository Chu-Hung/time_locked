# Solana Time-Locked Vault

## Overview

**Solana Time-Locked Vault** is a DeFi application built on the Solana blockchain that allows users to create time-locked vaults to secure assets (SOL and SPL tokens) for a specified period. Users can only withdraw their assets after the lock period expires.

### Key Features

- 🔒 Lock SOL and SPL tokens with customizable time periods
- ⏰ Automatic countdown system
- 💰 Full refund of fees (Rent account, deposit) when making a withdrawal
- 🔐 High security with PDA (Program Derived Address)

### Deployment Addresses

- **Program ID**: `5F3APs596H15YQeVXRfTYQwAGv2ynQCXJvDC9fc7LXUR`
- **Network**: Devnet/Localnet

## System Requirements

### Required Software

- **Node.js**: version 22.0.0 or higher
- **Rust**: version 1.80.0 or higher
- **Solana CLI**: version 2.2.00 or higher
- **Anchor Framework**: version 0.31.1
- Recommend using [**Bun**](https://bun.sh/), or any node package manager

### Supported Operating Systems

- macOS (tested)
- Linux
- Windows (WSL2)

## Installation

### 1. Clone repository

```bash
git clone <repository-url>
cd time_locked
```

### 2. Install dependencies

```bash
# Install dependencies for program
bun/yarn install
```

### 3. Build program

```bash
# Build Solana program
anchor build
```

### 4. Configure Solana

```bash
# Create new wallet (if not exists)
solana-keygen new

# Configure for devnet
solana config set --url devnet

# Or configure for localnet
solana config set --url localhost
```

### 5. Deploy program

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Or deploy to localnet
anchor deploy --provider.cluster localnet
```

## Running the Frontend Application

### 1. Run frontend app

```bash
# Run development server
bun/yarn run dev
```

The application will run at: [`http://localhost:5173`](http://localhost:5173)

## Program Account State Design

### Vault Account Structure

```rust
pub struct Vault {
    pub id: String,           // Unique identifier for vault
    pub owner: Pubkey,        // Owner's public key
    pub mint: Option<Pubkey>, // SPL token mint address (None for SOL)
    pub decimals: Option<u8>, // Token decimals
    pub amount: u64,          // Locked token amount
    pub unlock_time: i64,     // Timestamp when vault unlocks
    pub created_at: i64,      // Timestamp when vault was created
    pub bump: u8,             // Bump seed for PDA
}
```

### Program Instructions

#### 1. `initialize_lock`

- **Purpose**: Create SOL lock vault
- **Parameters**:
  - `id`: String identifier
  - `amount`: SOL amount (lamports)
  - `unlock_time`: Unlock timestamp

#### 2. `spl_initialize`

- **Purpose**: Create SPL token lock vault
- **Parameters**:
  - `id`: String identifier
  - `amount`: Token amount
  - `unlock_time`: Unlock timestamp

#### 3. `withdraw`

- **Purpose**: Withdraw SOL from unlocked vault
- **Validation**: Check time and ownership

#### 4. `spl_withdraw`

- **Purpose**: Withdraw SPL token from unlocked vault
- **Validation**: Check time, ownership and token type

### Error Codes

```rust
pub enum ErrorCode {
    VaultAlreadyExists,    // Vault already exists
    VaultDoesNotExist,     // Vault does not exist
    VaultNotUnlocked,      // Vault is not unlocked yet
    VaultIsNotSplToken,    // Vault is not an SPL token
}
```

## Running Test Cases

### 1. Run local validator

- Using [Amman](https://developers.metaplex.com/amman) for local test

```bash
bun/yarn run validator
```

### 2. Sync Keys

```bash
# Resync key with build target
anchor keys sync
```

### 3. Run all tests

```bash
anchor test --skip-local-validator
```

### 4. Test cases included

#### SOL Vault Tests

- ✅ Create SOL vault successfully
- ✅ Withdraw SOL before unlock time (fail)
- ✅ Withdraw SOL after unlock time (success)

#### SPL Token Vault Tests

- ✅ Create SPL token successfully
- ✅ Create SPL token vault successfully
- ✅ Withdraw SPL token after unlock time (success)

## Project Structure

```
time_locked/
├── programs/
│   └── time_locked/          # Solana program (Rust)
│       ├── src/
│       │   └── lib.rs        # Main program logic
│       └── Cargo.toml
├── app/                      # Frontend application (React + TypeScript)
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── constants/       # Constants and configurations
│   │   └── types/           # TypeScript types
│   └── package.json
├── tests/                    # Test files
│   └── time_locked.ts
├── target/                   # Build artifacts
├── Anchor.toml              # Anchor configuration
└── package.json
```

## Usage

### 1. Connect wallet

- Use Solana wallet adapter
- Supports Phantom, Backpack, Solflare, and other wallets support solana

### 2. Create vault

1. Click the "+" button to create a new vault
2. Select token type (SOL or SPL token) (for example you can faucet USDC devnet [here](https://spl-token-faucet.com/?token-name=USDC))
3. Enter token amount
4. Choose unlock time
5. Confirm transaction

### 3. Withdraw funds

- Vault will display countdown timer
- "Withdraw" button will be active when time expires
- Click to withdraw tokens to wallet

## Security

- Use PDA to generate vault addresses
- Check ownership before withdrawal
- Validate unlock time
- Automatic account closure after withdrawal
