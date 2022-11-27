use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh::try_from_slice_unchecked,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
use std::convert::TryInto;
pub mod instruction;
pub mod state;
use borsh::BorshSerialize;
use instruction::StudentIntro;
use state::StudentIntroState;
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = StudentIntro::unpack(instruction_data)?;

    match instruction {
        StudentIntro::AddStudentIntro { name, message } => {
            add_student_intro(program_id, accounts, name, message)
        }
    }
}

pub fn add_student_intro(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    message: String,
) -> ProgramResult {
    msg!("Adding Student Intro...");
    msg!("Name: {}", name);
    msg!("Message: {}", message);

    // Get Account iterator
    let account_info_iter = &mut accounts.iter();

    // Get accounts
    let initializer = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    let (pda, bump_seed) = Pubkey::find_program_address(
        &[initializer.key.as_ref(), name.as_bytes().as_ref()],
        program_id,
    );

    // Calculate account size required
    let account_len: usize = 1 + 1 + (4 + name.len()) + (4 + message.len());

    // Calculate rent required
    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(account_len);

    // Create the account
    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            pda_account.key,
            rent_lamports,
            account_len.try_into().unwrap(),
            program_id,
        ),
        &[
            initializer.clone(),
            pda_account.clone(),
            system_program.clone(),
        ],
        &[&[
            initializer.key.as_ref(),
            name.as_bytes().as_ref(),
            &[bump_seed],
        ]],
    )?;

    msg!("PDA created: {}", pda);

    msg!("unpacking state account");
    let mut account_data =
        try_from_slice_unchecked::<StudentIntroState>(&pda_account.data.borrow()).unwrap();
    msg!("borrowed account data");

    account_data.name = name;
    account_data.message = message;
    account_data.is_initialized = true;

    msg!("serializing account");
    account_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    msg!("state account serialized");

    Ok(())
}
