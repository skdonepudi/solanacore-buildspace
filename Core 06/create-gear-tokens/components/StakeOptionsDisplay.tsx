import { VStack, Text, Button } from "@chakra-ui/react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getAssociatedTokenAddress,
  getAccount,
  Account,
} from "@solana/spl-token"
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata"
import { STAKE_MINT } from "../utils/constants"
import { StakeAccount } from "../utils/accounts"
import { useWorkspace } from "./WorkspaceProvider"

export const StakeOptionsDisplay = ({
  nftData,
  stakeAccount,
  fetchState,
}: {
  nftData: any
  stakeAccount?: StakeAccount
  fetchState: (_: PublicKey) => void
}) => {
  const walletAdapter = useWallet()
  const { connection } = useConnection()

  const [isConfirmingTransaction, setIsConfirmingTransaction] = useState(false)
  const [nftTokenAccount, setNftTokenAccount] = useState<PublicKey>()
  const [bldTokenAccount, setBldTokenAccount] = useState<Account>()
  const workspace = useWorkspace()

  useEffect(() => {
    if (nftData) {
      connection
        .getTokenLargestAccounts(nftData.mint.address)
        .then((accounts) => setNftTokenAccount(accounts.value[0].address))
    }

    if (walletAdapter.publicKey) {
      getTokenAccount(walletAdapter.publicKey, connection)
    }
  }, [nftData, walletAdapter, connection])

  const getTokenAccount = async (
    publicKey: PublicKey,
    connection: Connection
  ) => {
    try {
      const ata = await getAssociatedTokenAddress(STAKE_MINT, publicKey)
      const account = await getAccount(connection, ata)
      setBldTokenAccount(account)
    } catch (error) {
      console.log(error)
    }
  }

  const handleStake = useCallback(async () => {
    if (
      !walletAdapter.connected ||
      !walletAdapter.publicKey ||
      !nftTokenAccount ||
      !workspace.stakingProgram
    ) {
      alert("Please connect your wallet")
      return
    }

    const transaction = new Transaction()

    transaction.add(
      await workspace.stakingProgram.methods
        .stake()
        .accounts({
          nftTokenAccount: nftTokenAccount,
          nftMint: nftData.mint.address,
          nftEdition: nftData.edition.address,
          metadataProgram: METADATA_PROGRAM_ID,
        })
        .instruction()
    )

    await sendAndConfirmTransaction(transaction)
  }, [walletAdapter, connection, nftData, nftTokenAccount])

  const sendAndConfirmTransaction = useCallback(
    async (transaction: Transaction) => {
      setIsConfirmingTransaction(true)

      try {
        const signature = await walletAdapter.sendTransaction(
          transaction,
          connection
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

        await getTokenAccount(walletAdapter.publicKey!, connection)
        if (nftData) {
          await fetchState(nftData.mint.address)
        }
      } catch (error) {
        console.log(error)
      } finally {
        setIsConfirmingTransaction(false)
      }
    },
    [walletAdapter, connection, nftData]
  )

  const handleUnstake = useCallback(async () => {
    if (
      !walletAdapter.connected ||
      !walletAdapter.publicKey ||
      !nftTokenAccount ||
      !workspace.stakingProgram
    ) {
      alert("Please connect your wallet")
      return
    }

    const userStakeATA = await getAssociatedTokenAddress(
      STAKE_MINT,
      walletAdapter.publicKey
    )

    const transaction = new Transaction()

    transaction.add(
      await workspace.stakingProgram.methods
        .unstake()
        .accounts({
          nftTokenAccount: nftTokenAccount,
          nftMint: nftData.mint.address,
          nftEdition: nftData.edition.address,
          metadataProgram: METADATA_PROGRAM_ID,
          stakeMint: STAKE_MINT,
          userStakeAta: userStakeATA,
        })
        .instruction()
    )

    await sendAndConfirmTransaction(transaction)
  }, [walletAdapter, connection, nftData, nftTokenAccount, workspace])

  const handleClaim = useCallback(async () => {
    if (
      !walletAdapter.connected ||
      !walletAdapter.publicKey ||
      !nftTokenAccount ||
      !workspace.stakingProgram
    ) {
      alert("Please connect your wallet")
      return
    }

    const userStakeATA = await getAssociatedTokenAddress(
      STAKE_MINT,
      walletAdapter.publicKey
    )

    const transaction = new Transaction()

    transaction.add(
      await workspace.stakingProgram.methods
        .redeem()
        .accounts({
          nftTokenAccount: nftTokenAccount,
          stakeMint: STAKE_MINT,
          userStakeAta: userStakeATA,
        })
        .instruction()
    )

    await sendAndConfirmTransaction(transaction)
  }, [walletAdapter, connection, nftData, nftTokenAccount])

  const daysStaked = useMemo(() => {
    return stakeAccount?.daysStaked() ?? 0
  }, [stakeAccount])

  return (
    <VStack
      bgColor="containerBg"
      borderRadius="20px"
      padding="20px 40px"
      spacing={5}
    >
      <Text
        bgColor="containerBgSecondary"
        padding="4px 8px"
        borderRadius="20px"
        color="bodyText"
        as="b"
        fontSize="sm"
      >
        {stakeAccount?.stakeState.staked
          ? daysStaked < 1
            ? "STAKED LESS THAN 1 DAY"
            : `STAKED ${daysStaked} DAY${
                Math.floor(daysStaked) === 1 ? "" : "S"
              }`
          : "READY TO STAKE"}
      </Text>
      <VStack spacing={-1}>
        <Text color="white" as="b" fontSize="4xl">
          {`${Number(bldTokenAccount?.amount ?? 0) / Math.pow(10, 2)} $BLD`}
        </Text>
        <Text color="bodyText">
          {stakeAccount?.stakeState.staked
            ? `${stakeAccount?.claimable().toPrecision(2)} $BLD earned`
            : "earn $BLD by staking"}
        </Text>
      </VStack>
      <Button
        onClick={stakeAccount?.stakeState.staked ? handleClaim : handleStake}
        bgColor="buttonGreen"
        width="200px"
        isLoading={isConfirmingTransaction}
      >
        <Text as="b">
          {stakeAccount?.stakeState.staked ? "claim $BLD" : "stake buildoor"}
        </Text>
      </Button>
      {stakeAccount?.stakeState.staked ? (
        <Button onClick={handleUnstake} isLoading={isConfirmingTransaction}>
          unstake
        </Button>
      ) : null}
    </VStack>
  )
}