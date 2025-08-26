#![allow(deprecated, unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{close_account, CloseAccount},
    token_interface::{
        self, transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
    },
};

declare_id!("G2Eu2D46kTMw4tbQ9HeoLvh3DeA6d4k1XUA6JfLbsY6Z");

#[program]
pub mod time_locked {
    use super::*;

    // Initialize a vault with SOL
    pub fn initialize_lock(
        ctx: Context<Initialize>,
        id: String,
        amount: u64,
        unlock_time: i64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.id = id;
        vault.owner = ctx.accounts.payer.key();
        vault.amount = amount;
        vault.unlock_time = unlock_time;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        let transfer_instruction =
            transfer(&ctx.accounts.payer.key(), &ctx.accounts.vault.key(), amount);

        invoke(
            &transfer_instruction,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.vault.to_account_info(),
            ],
        )?;

        msg!("Vault created successfully!");
        Ok(())
    }

    pub fn spl_initialize(
        ctx: Context<SplInitialize>,
        id: String,
        amount: u64,
        unlock_time: i64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.id = id;
        vault.owner = ctx.accounts.payer.key();
        vault.amount = amount;
        vault.mint = Some(ctx.accounts.mint.key());
        vault.unlock_time = unlock_time;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        let decimals = ctx.accounts.mint.decimals;
        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, amount, decimals)?;

        msg!("Vault created successfully!");
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let vault = &ctx.accounts.vault;
        if vault.owner != ctx.accounts.payer.key() {
            return Err(ErrorCode::VaultDoesNotExist.into());
        }

        if vault.unlock_time > Clock::get()?.unix_timestamp {
            return Err(ErrorCode::VaultNotUnlocked.into());
        }

        // Vault will be closed automatically by the close constraint
        // and all lamports will be refunded to payer
        msg!("Withdrawal successful! Vault closed");
        Ok(())
    }

    pub fn spl_withdraw(ctx: Context<SplWithdraw>) -> Result<()> {
        let vault = &ctx.accounts.vault;
        if vault.owner != ctx.accounts.payer.key() {
            return Err(ErrorCode::VaultDoesNotExist.into());
        }

        if vault.mint.is_none() {
            return Err(ErrorCode::VaultIsNotSplToken.into());
        }

        if vault.unlock_time > Clock::get()?.unix_timestamp {
            return Err(ErrorCode::VaultNotUnlocked.into());
        }

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            vault.owner.as_ref(),
            vault.id.as_ref(),
            &[vault.bump],
        ]];

        let decimals = ctx.accounts.mint.decimals;
        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.payer_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context =
            CpiContext::new(cpi_program.clone(), cpi_accounts).with_signer(signer_seeds);
        transfer_checked(cpi_context, vault.amount, decimals)?;

        let cpi_close_accounts = CloseAccount {
            account: ctx.accounts.vault_token_account.to_account_info(),
            destination: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };

        let cpi_ctx =
            CpiContext::new(cpi_program.clone(), cpi_close_accounts).with_signer(signer_seeds);
        close_account(cpi_ctx)?;

        msg!("Withdrawal successful! Vault closed");
        Ok(())
    }
}

pub const VAULT_SIZE: usize = 8 + 4 + 32 + 32 + 1 + 32 + 8 + 8 + 8;

#[derive(Accounts)]
#[instruction(id: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = VAULT_SIZE,
        seeds = [b"vault".as_ref(), payer.key().as_ref(), id.as_bytes()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: String)]
pub struct SplInitialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        space = VAULT_SIZE,
        seeds = [b"vault".as_ref(), payer.key().as_ref(), id.as_bytes()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // Close and refund all rent, value to payer
    #[account(mut, close = payer)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SplWithdraw<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, close = payer)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub id: String,
    pub owner: Pubkey,
    pub mint: Option<Pubkey>,
    pub amount: u64,
    pub unlock_time: i64,
    pub created_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Vault already exists")]
    VaultAlreadyExists,
    #[msg("Vault does not exist")]
    VaultDoesNotExist,
    #[msg("Vault is not unlocked")]
    VaultNotUnlocked,
    #[msg("Vault is not a SPL token")]
    VaultIsNotSplToken,
}
