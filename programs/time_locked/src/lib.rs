#![allow(deprecated, unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

declare_id!("FyFNB5HtCiAbrfT5PVJTU4QfxQLBczrH3rE5SepQqBPb");

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

    // Initialize a vault with SPL token
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

        let decimals = ctx.accounts.mint.decimals;

        // Transfer the tokens to the ata account owned by the PDA vault
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.payer.to_account_info(),
            to: ctx.accounts.ata_vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, amount, decimals)?;

        msg!("Vault created successfully!");
        Ok(())
    }
}

pub const VAULT_SIZE: usize = 8 + 32 + 1 + 32 + 8 + 8 + 8;

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
    #[account(
        init,
        payer = payer,
        space = VAULT_SIZE,
        seeds = [b"vault".as_ref(), payer.key().as_ref(), id.as_bytes()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub ata_vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
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
}

#[error_code]
pub enum ErrorCode {
    #[msg("Vault already exists")]
    VaultAlreadyExists,
    #[msg("Vault does not exist")]
    VaultDoesNotExist,
    #[msg("Vault is not unlocked")]
    VaultNotUnlocked,
}
