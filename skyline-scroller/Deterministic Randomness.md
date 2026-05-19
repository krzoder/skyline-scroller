# Deterministic Randomness
Our procedural generation relies entirely on deterministic seeded random number generation, provided by the `Random` class (`src/utils/Random.ts`).

## Mulberry32
The `Random` class implements the Mulberry32 PRNG (Pseudorandom Number Generator) algorithm. This ensures that for any given seed (whether it's a numeric value or a string, such as a hash or user-defined name), the exact same sequence of random numbers will be produced across different platforms and environments. String seeds are hashed using `cyrb128` to maintain uniformity.

## Impact on Systems
- [[City Generation]]: Determines City DNA variables such as building density and tree frequency, ensuring cities look identical on revisit.
- [[Biome System]]: Controls the generation of the initial biome, the biome sequence (see [[Biome Transitions]]), and the duration of each biome.
- [[Chunk System]]: Chunk widths, heights, colors, and object placements are all determined by this PRNG sequence.
