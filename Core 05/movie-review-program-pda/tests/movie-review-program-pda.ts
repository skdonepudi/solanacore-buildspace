import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MovieReviewProgramPda } from "../target/types/movie_review_program_pda";

describe("movie-review-program-pda", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.MovieReviewProgramPda as Program<MovieReviewProgramPda>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
