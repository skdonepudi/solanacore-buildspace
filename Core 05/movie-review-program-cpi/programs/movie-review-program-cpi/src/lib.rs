use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use mpl_token_metadata::instruction::create_metadata_accounts_v2;

declare_id!("AsE144X8Zp3YVFS8umdqHFfyUNLQosQ7mnCFEG2x1aTB");

#[program]
pub mod movie_review {
    use super::*;

    pub fn add_movie_review(
        ctx: Context<AddMovieReview>,
        title: String,
        description: String,
        rating: u8,
    ) -> Result<()> {
        msg!("Movie Review Account Created");
        msg!("Title: {}", title);
        msg!("Description: {}", description);
        msg!("Rating: {}", rating);

        if rating > 5 || rating < 1 {
            msg!("Rating cannot be higher than 5");
            return err!(ErrorCode::InvalidRating);
        }

        let movie_review = &mut ctx.accounts.movie_review;
        movie_review.reviewer = ctx.accounts.initializer.key();
        movie_review.title = title;
        movie_review.rating = rating;
        movie_review.description = description;

        msg!("Movie Comment Counter Account Created");
        let movie_comment_counter = &mut ctx.accounts.movie_comment_counter;
        movie_comment_counter.counter = 0;
        msg!("Counter: {}", movie_comment_counter.counter);

        let seeds = &["mint".as_bytes(), &[*ctx.bumps.get("reward_mint").unwrap()]];

        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.reward_mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.reward_mint.to_account_info(),
            },
            &signer,
        );

        token::mint_to(cpi_ctx, 10000000)?;
        msg!("Minted Tokens");
        Ok(())
    }

    pub fn add_comment(ctx: Context<AddComment>, comment: String) -> Result<()> {
        msg!("Comment Account Created");
        msg!("Comment: {}", comment);

        let movie_comment = &mut ctx.accounts.movie_comment;
        let movie_comment_counter = &mut ctx.accounts.movie_comment_counter;

        movie_comment.review = ctx.accounts.movie_review.key();
        movie_comment.commenter = ctx.accounts.initializer.key();
        movie_comment.comment = comment;
        movie_comment.count = movie_comment_counter.counter;

        movie_comment_counter.counter += 1;

        let seeds = &["mint".as_bytes(), &[*ctx.bumps.get("reward_mint").unwrap()]];

        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.reward_mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.reward_mint.to_account_info(),
            },
            &signer,
        );

        token::mint_to(cpi_ctx, 5000000)?;
        msg!("Minted Tokens");

        Ok(())
    }

    pub fn update_movie_review(
        ctx: Context<UpdateMovieReview>,
        title: String,
        description: String,
        rating: u8,
    ) -> Result<()> {
        msg!("Updating Movie Review Account");
        msg!("Title: {}", title);
        msg!("Description: {}", description);
        msg!("Rating: {}", rating);

        if rating > 5 || rating < 1 {
            msg!("Rating cannot be higher than 5");
            return err!(ErrorCode::InvalidRating);
        }

        let movie_review = &mut ctx.accounts.movie_review;
        movie_review.rating = rating;
        movie_review.description = description;

        Ok(())
    }

    // TODO: edit
    pub fn close(_ctx: Context<Close>) -> Result<()> {
        Ok(())
    }

    pub fn create_reward_mint(
        ctx: Context<CreateTokenReward>,
        uri: String,
        name: String,
        symbol: String,
    ) -> Result<()> {
        msg!("Create Reward Token");

        let seeds = &["mint".as_bytes(), &[*ctx.bumps.get("reward_mint").unwrap()]];

        let signer = [&seeds[..]];

        let account_info = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.reward_mint.to_account_info(),
            ctx.accounts.reward_mint.to_account_info(),
            ctx.accounts.user.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];

        invoke_signed(
            &create_metadata_accounts_v2(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.reward_mint.key(),
                ctx.accounts.reward_mint.key(),
                ctx.accounts.user.key(),
                ctx.accounts.user.key(),
                name,
                symbol,
                uri,
                None,
                0,
                true,
                true,
                None,
                None,
            ),
            account_info.as_slice(),
            &signer,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(title:String, description:String)]
pub struct AddMovieReview<'info> {
    #[account(
        init,
        seeds = [title.as_bytes(), initializer.key().as_ref()],
        bump,
        payer = initializer,
        space = 8 + 32 + 1 + 4 + title.len() + 4 + description.len()
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    #[account(
        init,
        seeds = ["counter".as_bytes(), movie_review.key().as_ref()],
        bump,
        payer = initializer,
        space = 8 + 8
    )]
    pub movie_comment_counter: Account<'info, MovieCommentCounter>,
    #[account(mut,
        seeds = ["mint".as_bytes().as_ref()],
        bump
    )]
    pub reward_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = initializer,
        associated_token::mint = reward_mint,
        associated_token::authority = initializer
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(comment:String)]
pub struct AddComment<'info> {
    #[account(
        init,
        seeds = [movie_review.key().as_ref(), &movie_comment_counter.counter.to_le_bytes()],
        bump,
        payer = initializer,
        space = 8 + 32 + 32 + 4 + comment.len() + 8
    )]
    pub movie_comment: Account<'info, MovieComment>,
    pub movie_review: Account<'info, MovieAccountState>,
    #[account(
        mut,
        seeds = ["counter".as_bytes(), movie_review.key().as_ref()],
        bump,
    )]
    pub movie_comment_counter: Account<'info, MovieCommentCounter>,
    #[account(mut,
        seeds = ["mint".as_bytes().as_ref()],
        bump
    )]
    pub reward_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = initializer,
        associated_token::mint = reward_mint,
        associated_token::authority = initializer
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title:String, description:String)]
pub struct UpdateMovieReview<'info> {
    #[account(
        mut,
        seeds = [title.as_bytes(), initializer.key().as_ref()],
        bump,
        realloc = 8 + 32 + 1 + 4 + title.len() + 4 + description.len(),
        realloc::payer = initializer,
        realloc::zero = false,
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// TODO: edit
#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut, close = reviewer, has_one = reviewer)]
    movie_review: Account<'info, MovieAccountState>,
    #[account(mut)]
    reviewer: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateTokenReward<'info> {
    #[account(
        init,
        seeds = ["mint".as_bytes().as_ref()],
        bump,
        payer = user,
        mint::decimals = 6,
        mint::authority = reward_mint,

    )]
    pub reward_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,

    /// CHECK:
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    /// CHECK:
    pub token_metadata_program: AccountInfo<'info>,
}

#[account]
pub struct MovieAccountState {
    pub reviewer: Pubkey,    // 32
    pub rating: u8,          // 1
    pub title: String,       // 4 + len()
    pub description: String, // 4 + len()
}

#[account]
pub struct MovieCommentCounter {
    pub counter: u64,
}

#[account]
pub struct MovieComment {
    pub review: Pubkey,    // 32
    pub commenter: Pubkey, // 32
    pub comment: String,   // 4 + len()
    pub count: u64,        // 8
}

#[error_code]
pub enum ErrorCode {
    #[msg("Rating greater than 5 or less than 1")]
    InvalidRating,
}
