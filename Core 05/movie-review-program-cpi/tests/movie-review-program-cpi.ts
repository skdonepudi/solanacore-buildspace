import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MovieReviewProgramCpi } from "../target/types/movie_review_program_cpi";

describe("movie-review-program-cpi", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.MovieReviewProgramCpi as Program<MovieReviewProgramCpi>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
