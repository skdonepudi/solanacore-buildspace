import { createContext, useContext } from "react"
import {
  Program,
  AnchorProvider,
  Idl,
  setProvider,
} from "@project-serum/anchor"
import idl from "./idl.json"
import { MovieReview, IDL } from "./movie_review"
import { Connection, PublicKey } from "@solana/web3.js"
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react"
import MockWallet from "./MockWallet"

const WorkspaceContext = createContext({})
const programId = new PublicKey("Ei4pESv6hd9iTch4Ji2qCP4KQcQ7jopCbiHCUsh1R8Jp")

interface WorkSpace {
  connection?: Connection
  provider?: AnchorProvider
  program?: Program<MovieReview>
}

const WorkspaceProvider = ({ children }: any) => {
  const wallet = useAnchorWallet() || MockWallet
  const { connection } = useConnection()

  const provider = new AnchorProvider(connection, wallet, {})

  setProvider(provider)
  const program = new Program(IDL as Idl, programId)
  const workspace = {
    connection,
    provider,
    program,
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  )
}

const useWorkspace = (): WorkSpace => {
  return useContext(WorkspaceContext)
}

export { WorkspaceProvider, useWorkspace }
