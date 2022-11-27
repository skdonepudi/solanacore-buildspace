use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct StudentIntroState {
    pub is_initialized: bool,
    pub name: String,
    pub message: String,
}
