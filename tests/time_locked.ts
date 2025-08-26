import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import * as token from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';
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
    const signature = await connection.requestAirdrop(payer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
  });

  it('Initialize lock SOL', async () => {
    const id = String(1);
    const lockTo = new anchor.BN(dayjs().add(1, 'day').unix());
    const amount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

    const tx = await program.methods
      .initializeLock(id, amount, lockTo)
      .accounts({
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: tx, ...latestBlockhash }, 'confirmed');

    const [vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), payer.publicKey.toBuffer(), Buffer.from(id)],
      program.programId,
    );
    const vault = await program.account.vault.fetch(vault_pda);
    const balance = await connection.getBalance(vault_pda);
    expect(balance).to.be.gte(amount.toNumber());
    expect(vault.id).to.equal(id);
  });

  it('Create new SPL token', async () => {
    const amount = 1000000000;

    spl_token = await token.createMint(connection, payer, payer.publicKey, null, 18);
    const owner_ata = await token.getOrCreateAssociatedTokenAccount(connection, payer, spl_token, payer.publicKey);
    await token.mintTo(connection, payer, spl_token, owner_ata.address, payer.publicKey, amount);

    const balance = await connection.getTokenAccountBalance(owner_ata.address);
    expect(balance.value.amount).to.equal(amount.toString());
  });

  it('Initialize lock SPL token', async () => {
    const id = String(2);
    const lockTo = new anchor.BN(dayjs().add(1, 'day').unix());
    const amount = new anchor.BN(30);

    const [vault_pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), payer.publicKey.toBuffer(), Buffer.from(id)],
      program.programId,
    );

    const vault_ata = await token.getOrCreateAssociatedTokenAccount(connection, payer, spl_token, vault_pda);

    const tx = await program.methods
      .splInitialize(id, amount, lockTo)
      .accounts({
        payer: payer.publicKey,
        mint: spl_token,
        ataVault: vault_ata.address,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: tx, ...latestBlockhash }, 'confirmed');

    const vault = await program.account.vault.fetch(vault_pda);
    expect(vault.id).to.equal(id);
    expect(vault.mint).to.equal(spl_token);

    const balance = await connection.getTokenAccountBalance(vault_ata.address);
    expect(balance.value.amount).to.equal(amount.toString());
  });
});
