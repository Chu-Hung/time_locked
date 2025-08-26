import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import * as token from '@solana/spl-token';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import dayjs from 'dayjs';
import { TimeLocked } from '../target/types/time_locked';

describe('Time Locked Program', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.timeLocked as Program<TimeLocked>;
  const connection = provider.connection;
  const payer = Keypair.generate();
  let spl_token: PublicKey | null = null;

  before(async () => {
    // airdrop sol to payer
    const signature = await connection.requestAirdrop(
      payer.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL,
    );
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      'confirmed',
    );
  });

  it('Should create a new lock SOL success', async () => {
    const id = String(1);
    const lockTo = new anchor.BN(dayjs().add(1, 'day').unix());
    const amount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .initializeLock(id, amount, lockTo)
      .accounts({
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature: tx, ...latestBlockhash },
      'confirmed',
    );

    const [vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), payer.publicKey.toBuffer(), Buffer.from(id)],
      program.programId,
    );
    const vault = await program.account.vault.fetch(vault_pda);
    const balance = await connection.getBalance(vault_pda);

    expect(balance).to.be.gte(amount.toNumber());
    expect(vault.id).to.equal(id);
  });

  it('Should create a new SPL token success', async () => {
    const amount = 1000000000;

    spl_token = await token.createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      18,
    );
    const owner_ata = await token.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      spl_token,
      payer.publicKey,
    );
    await token.mintTo(
      connection,
      payer,
      spl_token,
      owner_ata.address,
      payer.publicKey,
      amount,
    );

    const balance = await connection.getTokenAccountBalance(owner_ata.address);
    expect(balance.value.amount).to.equal(amount.toString());
  });

  it('Should create a new lock SPL token success', async () => {
    const id = String(2);
    const lockTo = new anchor.BN(dayjs().subtract(1, 'day').unix());
    const amount = new anchor.BN(30);

    const payer_ata = token.getAssociatedTokenAddressSync(
      spl_token,
      payer.publicKey,
    );

    const tx = await program.methods
      .splInitialize(id, amount, lockTo)
      .accounts({
        mint: spl_token,
        payer: payer.publicKey,
        payerTokenAccount: payer_ata,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature: tx, ...latestBlockhash },
      'confirmed',
    );

    const [vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), payer.publicKey.toBuffer(), Buffer.from(id)],
      program.programId,
    );

    const vault_ata = await token.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      spl_token,
      vault_pda,
      true,
    );

    const vault = await program.account.vault.fetch(vault_pda);
    expect(vault.id).to.equal(id);
    expect(vault.mint?.toBase58()).to.equal(spl_token.toBase58());

    const balance = await connection.getTokenAccountBalance(vault_ata.address);
    expect(balance.value.amount).to.equal(amount.toString());
  });

  it('Withdraw before unlock should fail', async () => {
    const id = String(1);
    const [vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), payer.publicKey.toBuffer(), Buffer.from(id)],
      program.programId,
    );

    try {
      await program.methods
        .withdraw()
        .accounts({
          payer: payer.publicKey,
          vault: vault_pda,
        })
        .signers([payer])
        .rpc();
      expect.fail('Expected VaultNotUnlocked error');
    } catch (err: any) {
      const message = err?.error?.errorMessage || err?.message || '';
      expect(message).to.include('Vault is not unlocked');
    }
  });

  it('Should withdraw SOL success', async () => {
    // Create a new lock that is already unlocked (past timestamp)
    const id = String(3);
    const lockTo = new anchor.BN(dayjs().subtract(1, 'day').unix());
    const amount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const initTx = await program.methods
      .initializeLock(id, amount, lockTo)
      .accounts({
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    {
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: initTx, ...latestBlockhash },
        'confirmed',
      );
    }

    const [vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), payer.publicKey.toBuffer(), Buffer.from(id)],
      program.programId,
    );

    const before_balance = await connection.getBalance(payer.publicKey);

    const tx = await program.methods
      .withdraw()
      .accounts({
        payer: payer.publicKey,
        vault: vault_pda,
      })
      .signers([payer])
      .rpc();

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature: tx, ...latestBlockhash },
      'confirmed',
    );

    const after_balance = await connection.getBalance(payer.publicKey);
    expect(after_balance).to.be.gte(before_balance);
  });

  it('Should withdraw SPL token success', async () => {
    const id = String(2);
    const [vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), payer.publicKey.toBuffer(), Buffer.from(id)],
      program.programId,
    );

    const vault_ata = token.getAssociatedTokenAddressSync(
      spl_token,
      vault_pda,
      true,
    );

    const vault = await program.account.vault.fetch(vault_pda);
    expect(vault.mint?.toBase58()).to.equal(spl_token?.toBase58());

    const payer_ata = token.getAssociatedTokenAddressSync(
      spl_token,
      payer.publicKey,
      false,
    );
    const before_balance = await connection.getTokenAccountBalance(payer_ata);

    const tx = await program.methods
      .splWithdraw()
      .accounts({
        payer: payer.publicKey,
        vault: vault_pda,
        mint: spl_token,
        payerTokenAccount: payer_ata,
        vaultTokenAccount: vault_ata,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature: tx, ...latestBlockhash },
      'confirmed',
    );

    const after_balance = await connection.getTokenAccountBalance(payer_ata);
    try {
      await connection.getTokenAccountBalance(vault_ata);
      expect.fail('Account should be closed');
    } catch (err: any) {
      const message = err?.error?.errorMessage || err?.message || '';
      expect(message).to.include('could not find account');
    }

    expect(Number(after_balance.value.amount)).to.be.gte(
      Number(before_balance.value.amount),
    );
  });
});
