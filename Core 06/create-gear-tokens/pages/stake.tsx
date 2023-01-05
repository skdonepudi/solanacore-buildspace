import {
  Heading,
  VStack,
  Text,
  HStack,
  Flex,
  Image,
  Center,
  SimpleGrid,
} from "@chakra-ui/react"
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { NextPage } from "next"
import { useCallback, useEffect, useState } from "react"
import MainLayout from "../components/MainLayout"
import { StakeOptionsDisplay } from "../components/StakeOptionsDisplay"
import { useWorkspace } from "../components/WorkspaceProvider"
import { getStakeAccount, StakeAccount } from "../utils/accounts"
import { GEAR_OPTIONS } from "../utils/constants"
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token"
import { Lootbox } from "../components/Lootbox"
import { GearItem } from "../components/GearItem"

const Stake: NextPage<StakeProps> = ({ mintAddress, imageSrc }) => {
  const [stakeAccount, setStakeAccount] = useState<StakeAccount>()
  const [nftTokenAccount, setNftTokenAccount] = useState<PublicKey>()
  const [nftData, setNftData] = useState<any>()
  const [gearBalances, setGearBalances] = useState<any>({})

  const { connection } = useConnection()
  const walletAdapter = useWallet()

  useEffect(() => {
    const metaplex = Metaplex.make(connection).use(
      walletAdapterIdentity(walletAdapter)
    )

    const mint = new PublicKey(mintAddress)

    try {
      metaplex
        .nfts()
        .findByMint({ mintAddress: mint })
        .run()
        .then((nft) => {
          setNftData(nft)
          fetchstate(nft.mint.address)
        })
    } catch (error) {
      console.log("error getting nft:", error)
    }
  }, [connection, walletAdapter])

  const { stakingProgram } = useWorkspace()
  const fetchstate = useCallback(
    async (mint: PublicKey) => {
      try {
        if (!walletAdapter.publicKey) {
          return
        }

        const tokenAccount = (await connection.getTokenLargestAccounts(mint))
          .value[0].address

        setNftTokenAccount(tokenAccount)

        const account = await getStakeAccount(
          stakingProgram,
          walletAdapter.publicKey,
          tokenAccount
        )

        setStakeAccount(account)

        let balances: any = {}
        for (let i = 0; i < GEAR_OPTIONS.length; i++) {
          const gearMint = GEAR_OPTIONS[i]
          const ata = await getAssociatedTokenAddress(
            gearMint,
            walletAdapter.publicKey
          )
          try {
            const account = await getAccount(connection, ata)
            balances[gearMint.toBase58()] = Number(account.amount)
          } catch {}
        }

        setGearBalances(balances)
      } catch (e) {
        console.log("error getting stake account:", e)
      }
    },
    [connection, walletAdapter, stakingProgram]
  )

  return (
    <MainLayout>
      <VStack spacing={7} justify="flex-start" align="flex-start">
        <Heading color="white" as="h1" size="2xl">
          Level up your buildoor
        </Heading>
        <Text color="bodyText" fontSize="xl" textAlign="start" maxWidth="600px">
          Stake your buildoor to earn 10 $BLD per day to get access to a
          randomized loot box full of upgrades for your buildoor
        </Text>
        <HStack spacing={20} alignItems="flex-start">
          <VStack align="flex-start" minWidth="200px">
            <Flex direction="column">
              <Image boxSize={200} objectFit={"cover"} src={imageSrc ?? ""} alt="buildoor nft" zIndex="1" />
              <Center
                bgColor="secondaryPurple"
                borderRadius="0 0 8px 8px"
                marginTop="-8px"
                zIndex="2"
                height="32px"
              >
                <Text
                  color="white"
                  as="b"
                  fontSize="md"
                  width="100%"
                  textAlign="center"
                >
                  {stakeAccount?.stakeState.staked ? "STAKING" : "UNSTAKED"}
                </Text>
              </Center>
            </Flex>
            <Text fontSize="2xl" as="b" color="white">
              LEVEL {1}
            </Text>
          </VStack>
          <VStack alignItems="flex-start" spacing={10}>
            <StakeOptionsDisplay
              nftData={nftData}
              stakeAccount={stakeAccount}
              fetchState={fetchstate}
            />
            <HStack spacing={10} align="start">
              {Object.keys(gearBalances).length > 0 && (
                <VStack alignItems="flex-start">
                  <Text color="white" as="b" fontSize="2xl">
                    Gear
                  </Text>
                  <SimpleGrid
                    columns={Math.min(2, Object.keys(gearBalances).length)}
                    spacing={3}
                  >
                    {Object.keys(gearBalances).map((key, _) => {
                      return (
                        <GearItem
                          item={key}
                          balance={gearBalances[key]}
                          key={key}
                        />
                      )
                    })}
                  </SimpleGrid>
                </VStack>
              )}
              <VStack alignItems="flex-start">
                <Text color="white" as="b" fontSize="2xl">
                  Loot Box
                </Text>
                <HStack>
                  {nftData && nftTokenAccount && (
                    <Lootbox
                      stakeAccount={stakeAccount}
                      nftTokenAccount={nftTokenAccount}
                      fetchUpstreamState={() => {
                        fetchstate(nftData.mint.address)
                      }}
                    />
                  )}
                </HStack>
              </VStack>
            </HStack>
          </VStack>
        </HStack>
      </VStack>
    </MainLayout>
  )
}

interface StakeProps {
  mintAddress: string
  imageSrc: string
}

Stake.getInitialProps = async ({ query }: any) => {
  const { mint, imageSrc } = query

  if (!mint || !imageSrc) throw { error: "no mint" }

  try {
    const _ = new PublicKey(mint)

    return { mintAddress: mint, imageSrc: imageSrc }
  } catch {
    throw { error: "invalid mint" }
  }
}

export default Stake