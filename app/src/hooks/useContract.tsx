/* eslint-disable react-hooks/exhaustive-deps */
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { Form, notification } from 'antd';
import { BN } from 'bn.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import idl from '../assets/time_locked.json';
import { type TimeLocked } from '../types/time_locked';
dayjs.extend(utc);

export const useContract = () => {
  const [toast, contextHolder] = notification.useNotification();
  const [form] = Form.useForm<{
    token: string;
    amount: number;
    mint: string;
    unlockTime: Date;
  }>();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [submitting, setSubmitting] = useState(false);

  const provider = useMemo(() => {
    if (!wallet?.publicKey || !connection) return null;
    const provider = new AnchorProvider(connection, wallet, {});
    setProvider(provider);
    return provider;
  }, [wallet, connection]);

  const program = useMemo(() => {
    if (!wallet?.publicKey || !connection || !provider) return null;

    return new Program<TimeLocked>(idl as TimeLocked, provider);
  }, [wallet, connection, provider]);

  const fetchMyVault = async () => {
    if (!program || !wallet) return [];

    const vaults = await program.account.vault.all();

    return vaults.filter((vault) =>
      vault.account.owner.equals(wallet.publicKey),
    );
  };

  const {
    data: vaults,
    isLoading,
    mutate,
  } = useSWR(wallet?.publicKey ? 'my-vault' : null, fetchMyVault);

  const getNextId = async () => {
    if (!program) return 0;
    const all = await program.account.vault.all();
    const ids = all.map((vault) => Number(vault.account.id));
    return ids.length > 0 ? Math.max(...ids) + 1 : 0;
  };

  // New lock vault with sol
  const newNativeLock = useCallback(
    async (amount: number, unlockTime: number) => {
      if (!program || !wallet) return;

      const id = await getNextId();
      const ix = await program.methods
        .initializeLock(id.toString(), new BN(amount), new BN(unlockTime))
        .accounts({
          payer: wallet.publicKey,
        })
        .instruction();

      const blockhash = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash.blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const tx = new VersionedTransaction(messageV0);
      const signature = await wallet.signTransaction(tx);
      const txHash = await connection.sendRawTransaction(signature.serialize());

      await connection.confirmTransaction({
        signature: txHash,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      });

      mutate();
      toast.success({
        message: 'Vault created',
        description: `Tx: ${txHash}`,
      });

      return txHash;
    },
    [wallet],
  );

  // Withdraw sol from vault
  const nativeWithdraw = useCallback(
    async (id: string) => {
      if (!program || !wallet) return;

      const [vault_pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), wallet.publicKey.toBuffer(), Buffer.from(id)],
        program.programId,
      );

      const ix = await program.methods
        .withdraw()
        .accounts({
          payer: wallet.publicKey,
          vault: vault_pda,
        })
        .instruction();

      const blockhash = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash.blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const tx = new VersionedTransaction(messageV0);
      const signature = await wallet.signTransaction(tx);
      const txHash = await connection.sendRawTransaction(signature.serialize());

      await connection.confirmTransaction({
        signature: txHash,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      });

      mutate();
      toast.success({
        message: 'Withdrawal successful',
        description: `Tx: ${txHash}`,
      });
    },
    [wallet],
  );

  const newSplLock = useCallback(
    async (amount: number, unlockTime: number, mint: string) => {
      if (!program || !wallet) return;
      const mint_pubkey = new PublicKey(mint);

      const id = await getNextId();
      const tokenAccount = await getMint(connection, mint_pubkey);

      const payer_ata = getAssociatedTokenAddressSync(
        mint_pubkey,
        wallet.publicKey,
      );

      const ix = await program.methods
        .splInitialize(
          String(id),
          new BN(amount * 10 ** tokenAccount.decimals),
          new BN(unlockTime),
        )
        .accounts({
          mint: mint_pubkey,
          payer: wallet.publicKey,
          payerTokenAccount: payer_ata,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const blockhash = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash.blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const tx = new VersionedTransaction(messageV0);
      const signature = await wallet.signTransaction(tx);
      const txHash = await connection.sendRawTransaction(signature.serialize());

      await connection.confirmTransaction({
        signature: txHash,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      });

      mutate();
      toast.success({
        message: 'Vault created',
        description: `Tx: ${txHash}`,
      });
    },
    [wallet],
  );

  const splWithdraw = useCallback(
    async (id: string, mint: string) => {
      if (!program || !wallet) return;
      const mint_pubkey = new PublicKey(mint);

      const [vault_pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), wallet.publicKey.toBuffer(), Buffer.from(id)],
        program.programId,
      );

      const vault_ata = getAssociatedTokenAddressSync(
        mint_pubkey,
        vault_pda,
        true,
      );

      const payer_ata = getAssociatedTokenAddressSync(
        mint_pubkey,
        wallet.publicKey,
      );

      const ix = await program.methods
        .splWithdraw()
        .accounts({
          payer: wallet.publicKey,
          vault: vault_pda,
          mint: mint,
          payerTokenAccount: payer_ata,
          vaultTokenAccount: vault_ata,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const blockhash = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash.blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const tx = new VersionedTransaction(messageV0);
      const signature = await wallet.signTransaction(tx);
      const txHash = await connection.sendRawTransaction(signature.serialize());

      await connection.confirmTransaction({
        signature: txHash,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      });

      mutate();
      toast.success({
        message: 'Withdrawal successful',
        description: `Tx: ${txHash}`,
      });
    },
    [wallet],
  );

  const onSubmit = async () => {
    const values = await form.validateFields();
    if (values.token !== 'OTHER') {
      values.mint = values.token.trim();
    }

    const unlockTime = dayjs(values.unlockTime).utc().unix();

    setSubmitting(true);
    if (values.token === 'NATIVE') {
      await newNativeLock(values.amount * LAMPORTS_PER_SOL, unlockTime);
    } else {
      await newSplLock(values.amount, unlockTime, values.mint);
    }
    setSubmitting(false);
    form.resetFields();
  };

  const withdraw = async (id: string, mint?: string) => {
    if (mint) {
      await splWithdraw(id, mint);
    } else {
      await nativeWithdraw(id);
    }
  };

  return {
    form,
    wallet,
    vaults,
    isLoading,
    submitting,
    contextHolder,
    withdraw,
    newNativeLock,
    onSubmit,
    mutate,
  };
};
