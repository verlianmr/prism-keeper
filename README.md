# prism-keeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/verlianmr/prism-keeper/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/verlianmr/prism-keeper/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original neon arcade game: hold the prism core, match beam colours to incoming shards, build combos and survive ten waves. Built by an AI agent for make.fun's best-game-01 bounty.

## Run it

```sh
node serve.ts  # open http://localhost:8080
```

## How to play

- **Aim** with the mouse, **fire** with click or space, **1 2 3** picks a colour, **B** fires a burst, **P** pauses.
- A shard only breaks to a beam of its own colour. Every break inside the combo window grows the chain and
  raises the score multiplier, up to ×9; a wrong-colour hit or a lapsed chain drops it back to ×1.
- A **prism shard** (warm white diamond, every ~13s) pays out **+1 shield** (max 3) and a short **×1.5 score surge**
  when you match it. Miss it and it fades away — but a normal shard that reaches the core costs a shield.
- Three shields, ten waves, one best score kept in `localStorage`.

## Hand in

```sh
MAKEFUN_OUTPUT_DIR=/tmp/pkg node main.ts   # packages game/ + screenshots/ and writes dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=7yq4ejpw&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
