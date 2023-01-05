import { Center, Text, Button } from "@chakra-ui/react"
import {
  useConnection,
  useWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react"
import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { MouseEventHandler, useCallback, useEffect, useState } from "react"
import { StakeAccount } from "../utils/accounts"
import { LOOTBOX_PROGRAM_ID } from "../utils/constants"
import { useWorkspace } from "./WorkspaceProvider"
import { LootboxProgram } from "../utils/lootbox_program"
import { Program } from "@project-serum/anchor"
import { SwitchboardProgram } from "@switchboard-xyz/switchboard-v2"
import {
  createInitSwitchboardInstructions,
  createOpenLootboxInstructions,
} from "../utils/instructions"
import { AnchorNftStaking } from "../utils/anchor_nft_staking"
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { SendTransactionOptions } from "@solana/wallet-adapter-base"

export const Lootbox = ({
  stakeAccount,
  nftTokenAccount,
  fetchUpstreamState,
}: {
  stakeAccount?: StakeAccount
  nftTokenAccount: PublicKey
  fetchUpstreamState: () => void
}) => {
  const [isConfirmingTransaction, setIsConfirmingTransaction] = useState(false)
  const [availableLootbox, setAvailableLootbox] = useState(0)
  const walletAdapter = useWallet()
  const { stakingProgram, lootboxProgram, switchboardProgram } = useWorkspace()
  const { connection } = useConnection()

  const [userAccountExists, setUserAccountExist] = useState(false)
  const [mint, setMint] = useState<PublicKey>()

  useEffect(() => {
    if (!walletAdapter.publicKey || !lootboxProgram || !stakingProgram) return

    handleStateRefresh(lootboxProgram, walletAdapter.publicKey)
  }, [walletAdapter, lootboxProgram])

  const handleOpenLootbox: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      if (
        event.defaultPrevented ||
        !walletAdapter.publicKey ||
        !lootboxProgram ||
        !switchboardProgram ||
        !stakingProgram
      )
        return

      openLootbox(
        connection,
        userAccountExists,
        walletAdapter.publicKey,
        lootboxProgram,
        switchboardProgram,
        stakingProgram
      )
    },
    [
      lootboxProgram,
      connection,
      walletAdapter,
      userAccountExists,
      walletAdapter,
      switchboardProgram,
      stakingProgram,
    ]
  )

  const handleRedeemLoot: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      if (
        event.defaultPrevented ||
        !walletAdapter.publicKey ||
        !lootboxProgram ||
        !mint
      )
        return

      const userGearAta = await getAssociatedTokenAddress(
        mint,
        walletAdapter.publicKey
      )

      const transaction = new Transaction()
      transaction.add(
        await lootboxProgram.methods
          .retrieveItemFromLootbox()
          .accounts({
            mint: mint,
            userGearAta: userGearAta,
          })
          .instruction()
      )

      sendAndConfirmTransaction(connection, walletAdapter, transaction)
    },
    [walletAdapter, lootboxProgram, mint]
  )

  // check if UserState account exists
  // if UserState account exists also check if there is a redeemable item from lootbox
  const checkUserAccount = async (
    lootboxProgram: Program<LootboxProgram>,
    publicKey: PublicKey
  ) => {
    try {
      const [userStatePda] = PublicKey.findProgramAddressSync(
        [publicKey.toBytes()],
        lootboxProgram.programId
      )
      const account = await lootboxProgram.account.userState.fetch(userStatePda)
      if (account) {
        setUserAccountExist(true)
      } else {
        setMint(undefined)
        setUserAccountExist(false)
      }
    } catch {}
  }

  const fetchLootboxPointer = async (
    lootboxProgram: Program<LootboxProgram>,
    publicKey: PublicKey
  ) => {
    try {
      const [lootboxPointerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lootbox"), publicKey.toBytes()],
        LOOTBOX_PROGRAM_ID
      )

      const lootboxPointer = await lootboxProgram.account.lootboxPointer.fetch(
        lootboxPointerPda
      )

      setAvailableLootbox(lootboxPointer.availableLootbox.toNumber())
      setMint(lootboxPointer.redeemable ? lootboxPointer.mint : undefined)
    } catch (error) {
      console.log(error)
      setAvailableLootbox(10)
      setMint(undefined)
    }
  }

  const handleStateRefresh = async (
    lootboxProgram: Program<LootboxProgram>,
    publicKey: PublicKey
  ) => {
    checkUserAccount(lootboxProgram, publicKey)
    fetchLootboxPointer(lootboxProgram, publicKey)
  }

  const openLootbox = async (
    connection: Connection,
    userAccountExists: boolean,
    publicKey: PublicKey,
    lootboxProgram: Program<LootboxProgram>,
    switchboardProgram: SwitchboardProgram,
    stakingProgram: Program<AnchorNftStaking>
  ) => {
    if (!userAccountExists) {
      const { instructions, vrfKeypair } =
        await createInitSwitchboardInstructions(
          switchboardProgram,
          lootboxProgram,
          publicKey
        )

      const transaction = new Transaction()
      transaction.add(...instructions)
      sendAndConfirmTransaction(connection, walletAdapter, transaction, {
        signers: [vrfKeypair],
      })
    } else {
      const instructions = await createOpenLootboxInstructions(
        connection,
        stakingProgram,
        switchboardProgram,
        lootboxProgram,
        publicKey,
        nftTokenAccount,
        availableLootbox
      )

      const transaction = new Transaction()
      transaction.add(...instructions)
      try {
        await sendAndConfirmTransaction(connection, walletAdapter, transaction)
        setIsConfirmingTransaction(true)
        const [lootboxPointerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("lootbox"), publicKey.toBytes()],
          lootboxProgram.programId
        )

        const id = await connection.onAccountChange(
          lootboxPointerPda,
          async (_) => {
            try {
              const account = await lootboxProgram.account.lootboxPointer.fetch(
                lootboxPointerPda
              )
              if (account.redeemable) {
                setMint(account.mint)
                connection.removeAccountChangeListener(id)
                setIsConfirmingTransaction(false)
              }
            } catch (error) {
              console.log("Error in waiter:", error)
            }
          }
        )
      } catch (error) {
        console.log(error)
      }
    }
  }

  const sendAndConfirmTransaction = async (
    connection: Connection,
    walletAdapter: WalletContextState,
    transaction: Transaction,
    options?: SendTransactionOptions
  ) => {
    setIsConfirmingTransaction(true)

    try {
      const signature = await walletAdapter.sendTransaction(
        transaction,
        connection,
        options
      )
      const latestBlockhash = await connection.getLatestBlockhash()
      await connection.confirmTransaction(
        {
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          signature: signature,
        },
        "finalized"
      )

      console.log("Transaction complete")
      await Promise.all([
        handleStateRefresh(lootboxProgram!, walletAdapter.publicKey!),
        fetchUpstreamState(),
      ])
    } catch (error) {
      console.log(error)
      throw error
    } finally {
      setIsConfirmingTransaction(false)
    }
  }

  return (
    <Center
      height="120px"
      width="120px"
      bgColor={"containerBg"}
      borderRadius="10px"
    >
      {availableLootbox &&
      stakeAccount &&
      stakeAccount.totalEarned.toNumber() >= availableLootbox ? (
        <Button
          borderRadius="25"
          onClick={mint ? handleRedeemLoot : handleOpenLootbox}
          isLoading={isConfirmingTransaction}
        >
          {mint
            ? "Redeem"
            : userAccountExists
            ? `${availableLootbox} $BLD`
            : "Enable"}
        </Button>
      ) : (
        <Text color="bodyText">Keep Staking</Text>
      )}
    </Center>
  )
}