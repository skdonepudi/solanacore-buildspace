import { Card } from "./Card"
import { FC, useEffect, useState } from "react"
import {
  Button,
  Center,
  HStack,
  Input,
  Spacer,
  Heading,
} from "@chakra-ui/react"
import { useWorkspace } from "../context"
import { useWallet } from "@solana/wallet-adapter-react"
import { useDisclosure } from "@chakra-ui/react"
import { ReviewDetail } from "./ReviewDetail"

export const MovieList: FC = () => {
  const { program } = useWorkspace()
  const [movies, setMovies] = useState<any | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [result, setResult] = useState<any | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const wallet = useWallet()

  useEffect(() => {
    const fetchAccounts = async () => {
      if (program) {
        const accounts = (await program.account.movieAccountState.all()) ?? []

        const sort = [...accounts].sort((a, b) =>
          a.account.title > b.account.title ? 1 : -1
        )
        setMovies(sort)
      }
    }
    fetchAccounts()
  }, [program])

  useEffect(() => {
    if (movies && search != "") {
      const filtered = movies.filter((movie: any) => {
        return movie.account.title
          .toLowerCase()
          .startsWith(search.toLowerCase())
      })
      console.log(filtered)
      setResult(filtered)
    }
  }, [movies, search])

  useEffect(() => {
    if (movies && search == "") {
      const filtered = movies.slice((page - 1) * 3, page * 3)
      console.log(filtered)
      setResult(filtered)
    }
  }, [page, movies, search])

  const fetchMyReviews = async () => {
    if (wallet.connected && program) {
      const accounts =
        (await program.account.movieAccountState.all([
          {
            memcmp: {
              offset: 8,
              bytes: wallet.publicKey!.toBase58(),
            },
          },
        ])) ?? []

      const sort = [...accounts].sort((a, b) =>
        a.account.title > b.account.title ? 1 : -1
      )
      setResult(sort)
    } else {
      alert("Please Connect Wallet")
    }
  }

  const handleReviewSelected = (data: any) => {
    setSelectedMovie(data)
    onOpen()
  }

  return (
    <div>
      <Center>
        <Input
          id="search"
          color="gray.400"
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search"
          w="97%"
          mt={2}
          mb={2}
          margin={2}
        />
        <Button onClick={fetchMyReviews}>My Reviews</Button>
      </Center>
      <Heading as="h1" size="l" color="white" ml={4} mt={8}>
        Select Review To Comment
      </Heading>
      {selectedMovie && (
        <ReviewDetail isOpen={isOpen} onClose={onClose} movie={selectedMovie} />
      )}
      {result && (
        <div>
          {Object.keys(result).map((key) => {
            const data = result[key as unknown as number]
            return (
              <Card
                key={key}
                movie={data}
                onClick={() => {
                  handleReviewSelected(data)
                }}
              />
            )
          })}
        </div>
      )}
      <Center>
        {movies && (
          <HStack w="full" mt={2} mb={8} ml={4} mr={4}>
            {page > 1 && (
              <Button onClick={() => setPage(page - 1)}>Previous</Button>
            )}
            <Spacer />
            {movies.length > page * 3 && (
              <Button onClick={() => setPage(page + 1)}>Next</Button>
            )}
          </HStack>
        )}
      </Center>
    </div>
  )
}
