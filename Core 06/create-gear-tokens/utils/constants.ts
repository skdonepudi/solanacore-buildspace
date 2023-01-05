import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_STAKE_PROGRAM_ID ?? ""
);

export const STAKE_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_STAKE_MINT_ADDRESS ?? ""
);
export const LOOTBOX_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_LOOTBOX_PROGRAM_ID ?? ""
);

const gearOptions = [
  "FcPtXZUzJPzCyKBvhiyPKtawmu8SQQjedrht8wjGEown",
  "9uASASw85NeEkzLxGb7MsKcUNjwvFyja1YXqmfHfqxFe",
  "DW5YoFFBboRA7XTgrLUnHUXuKtSvB5wzgYHtDCQmQr3C",
  "FwaKUWAmmaxf5333KEAGLxnPcL5LJ3ykyDRBDRTebxRW",
  "82i4ki7nFJHBfEAJTmrkZ6E2DrY4vT8MHhK4wYaMChRY",
];
export const GEAR_OPTIONS = gearOptions.map((x) => new PublicKey(x));
