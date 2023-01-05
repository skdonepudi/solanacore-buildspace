import { createContext, useContext, useEffect, useState } from "react"
import {
  Program,
  AnchorProvider,
  Idl,
  setProvider,
} from "@project-serum/anchor"
import { AnchorNftStaking, IDL } from "../utils/anchor_nft_staking"
import { Connection } from "@solana/web3.js"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import MockWallet from "./MockWallet"
import {
  IDL as StakingIDL,
} from "../utils/anchor_nft_staking"
import { IDL as LootboxIDL } from "../utils/lootbox_program"
import { PROGRAM_ID, LOOTBOX_PROGRAM_ID } from "../utils/constants"
import {
  AnchorWallet,
  loadSwitchboardProgram,
} from "@switchboard-xyz/switchboard-v2"
import { LootboxProgram } from "../utils/lootbox_program"

const WorkspaceContext = createContext({})
const programId = PROGRAM_ID

interface Workspace {
  connection?: Connection
  provider?: AnchorProvider
  program?: Program<AnchorNftStaking>
  stakingProgram?: Program<AnchorNftStaking>
  lootboxProgram?: Program<LootboxProgram>
  switchboardProgram?: any
}

const WorkspaceProvider = ({ children }: any) => {
  const wallet = useAnchorWallet() || MockWallet
  const { connection } = useConnection()

  const provider = new AnchorProvider(connection, wallet, {})
  setProvider(provider)

  const [switchboardProgram, setProgramSwitchboard] = useState<any>()
  const stakingProgram = new Program(StakingIDL as Idl, PROGRAM_ID)
  const lootboxProgram = new Program(LootboxIDL as Idl, LOOTBOX_PROGRAM_ID)

  async function program() {
    let response = await loadSwitchboardProgram(
      "devnet",
      connection,
      ((provider as AnchorProvider).wallet as AnchorWallet).payer
    )
    return response
  }

  useEffect(() => {
    program().then((result) => {
      setProgramSwitchboard(result)
      console.log("result", result)
    })
  }, [connection])

  const workspace = {
    connection,
    provider,
    stakingProgram,
    lootboxProgram,
    switchboardProgram,
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  )
}

const useWorkspace = (): Workspace => {
  return useContext(WorkspaceContext)
}

export { WorkspaceProvider, useWorkspace }