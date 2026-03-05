import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../stores/game'
import { Category } from '../types/game'

describe('game store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts in setup phase', () => {
    const game = useGameStore()
    expect(game.phase).toBe('setup')
    expect(game.players).toHaveLength(0)
  })

  it('starts game with player names', () => {
    const game = useGameStore()
    game.startGame(['Jussi', 'Akseli'])
    expect(game.phase).toBe('playing')
    expect(game.players).toHaveLength(2)
    expect(game.players[0]!.name).toBe('Jussi')
    expect(game.players[1]!.name).toBe('Akseli')
  })

  it('has 3 rolls per turn', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    expect(game.rollsLeft).toBe(3)
    game.roll()
    expect(game.rollsLeft).toBe(2)
    game.roll()
    expect(game.rollsLeft).toBe(1)
    game.roll()
    expect(game.rollsLeft).toBe(0)
  })

  it('does not roll beyond 0 rolls left', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    game.roll()
    game.roll()
    const values = game.diceValues.slice()
    game.roll()
    expect(game.diceValues).toEqual(values)
    expect(game.rollsLeft).toBe(0)
  })

  it('toggles die lock after rolling', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    expect(game.dice[0]!.locked).toBe(false)
    game.toggleLock(0)
    expect(game.dice[0]!.locked).toBe(true)
    game.toggleLock(0)
    expect(game.dice[0]!.locked).toBe(false)
  })

  it('does not toggle lock before rolling', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.toggleLock(0)
    expect(game.dice[0]!.locked).toBe(false)
  })

  it('locked dice keep their value on roll', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    const lockedValue = game.dice[0]!.value
    game.toggleLock(0)
    // Roll many times to be statistically certain
    game.roll()
    expect(game.dice[0]!.value).toBe(lockedValue)
  })

  it('selects category and records score', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    game.selectCategory(Category.Chance)
    expect(game.players[0]!.scores.has(Category.Chance)).toBe(true)
  })

  it('resets rolls after selecting category', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    game.selectCategory(Category.Chance)
    expect(game.rollsLeft).toBe(3)
    expect(game.hasRolled).toBe(false)
  })

  it('does not allow selecting same category twice', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    game.selectCategory(Category.Chance)
    game.roll()
    game.selectCategory(Category.Chance)
    // Should still only have 1 score entry, second select should be ignored
    expect(game.turnsPlayed).toBe(1)
  })

  it('does not allow selecting category before rolling', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.selectCategory(Category.Chance)
    expect(game.players[0]!.scores.size).toBe(0)
  })

  it('alternates players in multiplayer', () => {
    const game = useGameStore()
    game.startGame(['Jussi', 'Akseli'])
    expect(game.currentPlayer!.name).toBe('Jussi')
    game.roll()
    game.selectCategory(Category.Ones)
    expect(game.currentPlayer!.name).toBe('Akseli')
    game.roll()
    game.selectCategory(Category.Twos)
    expect(game.currentPlayer!.name).toBe('Jussi')
  })

  it('tracks current round', () => {
    const game = useGameStore()
    game.startGame(['Jussi', 'Akseli'])
    expect(game.currentRound).toBe(1)
    game.roll()
    game.selectCategory(Category.Ones)
    expect(game.currentRound).toBe(1) // Akseli still needs to play round 1
    game.roll()
    game.selectCategory(Category.Ones)
    expect(game.currentRound).toBe(2)
  })

  it('finishes game after all rounds', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    const categories = [
      Category.Ones, Category.Twos, Category.Threes,
      Category.Fours, Category.Fives, Category.Sixes,
      Category.Pair, Category.TwoPairs, Category.ThreeOfAKind,
      Category.FourOfAKind, Category.SmallStraight, Category.LargeStraight,
      Category.FullHouse, Category.Chance, Category.Yatzy,
    ]
    for (const cat of categories) {
      game.roll()
      game.selectCategory(cat)
    }
    expect(game.phase).toBe('finished')
    expect(game.isGameOver).toBe(true)
  })

  it('calculates upper bonus at 63+', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    // Manually set upper scores to exactly 63
    const player = game.players[0]!
    player.scores.set(Category.Ones, 3)    // 3
    player.scores.set(Category.Twos, 6)    // 6
    player.scores.set(Category.Threes, 9)  // 9
    player.scores.set(Category.Fours, 12)  // 12
    player.scores.set(Category.Fives, 15)  // 15
    player.scores.set(Category.Sixes, 18)  // 18 = 63 total
    expect(game.upperBonus(player)).toBe(50)
    expect(game.upperSum(player)).toBe(63)
  })

  it('no upper bonus below 63', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    const player = game.players[0]!
    player.scores.set(Category.Ones, 3)
    player.scores.set(Category.Twos, 6)
    player.scores.set(Category.Threes, 9)
    player.scores.set(Category.Fours, 12)
    player.scores.set(Category.Fives, 15)
    player.scores.set(Category.Sixes, 17) // 62 total
    expect(game.upperBonus(player)).toBe(0)
  })

  it('determines winner in multiplayer', () => {
    const game = useGameStore()
    game.startGame(['Jussi', 'Akseli'])
    const categories = [
      Category.Ones, Category.Twos, Category.Threes,
      Category.Fours, Category.Fives, Category.Sixes,
      Category.Pair, Category.TwoPairs, Category.ThreeOfAKind,
      Category.FourOfAKind, Category.SmallStraight, Category.LargeStraight,
      Category.FullHouse, Category.Chance, Category.Yatzy,
    ]
    // Give Jussi high scores and Akseli zeros
    const jussi = game.players[0]!
    const akseli = game.players[1]!
    for (const cat of categories) {
      jussi.scores.set(cat, 10)
      akseli.scores.set(cat, 1)
    }
    expect(game.winner!.name).toBe('Jussi')
  })

  it('restartGame keeps players, resets scores', () => {
    const game = useGameStore()
    game.startGame(['Jussi', 'Akseli'])
    game.roll()
    game.selectCategory(Category.Ones)
    expect(game.players[0]!.scores.size).toBe(1)

    game.restartGame()
    expect(game.phase).toBe('playing')
    expect(game.players).toHaveLength(2)
    expect(game.players[0]!.name).toBe('Jussi')
    expect(game.players[0]!.scores.size).toBe(0)
    expect(game.players[1]!.scores.size).toBe(0)
    expect(game.rollsLeft).toBe(3)
    expect(game.currentRound).toBe(1)
  })

  it('newGame resets everything to setup', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    game.selectCategory(Category.Ones)

    game.newGame()
    expect(game.phase).toBe('setup')
    expect(game.players).toHaveLength(0)
    expect(game.rollsLeft).toBe(3)
  })

  describe('undo', () => {
    it('undoes last category selection', () => {
      const game = useGameStore()
      game.startGame(['Jussi'])
      game.roll()
      const diceBeforeSelect = game.diceValues.slice()
      game.selectCategory(Category.Chance)
      expect(game.players[0]!.scores.has(Category.Chance)).toBe(true)

      game.undoLastCategory()
      expect(game.players[0]!.scores.has(Category.Chance)).toBe(false)
      expect(game.diceValues).toEqual(diceBeforeSelect)
    })

    it('cannot undo if nothing to undo', () => {
      const game = useGameStore()
      game.startGame(['Jussi'])
      expect(game.canUndo).toBe(false)
      game.undoLastCategory()
      expect(game.turnsPlayed).toBe(0)
    })

    it('cannot undo after next player has rolled', () => {
      const game = useGameStore()
      game.startGame(['Jussi', 'Akseli'])
      game.roll()
      game.selectCategory(Category.Ones)
      expect(game.canUndo).toBe(true)
      game.roll() // Akseli rolls
      expect(game.canUndo).toBe(false)
    })

    it('undo restores correct player turn in multiplayer', () => {
      const game = useGameStore()
      game.startGame(['Jussi', 'Akseli'])
      game.roll()
      game.selectCategory(Category.Ones)
      expect(game.currentPlayer!.name).toBe('Akseli')
      game.undoLastCategory()
      expect(game.currentPlayer!.name).toBe('Jussi')
    })

    it('clears undo after roll', () => {
      const game = useGameStore()
      game.startGame(['Jussi'])
      game.roll()
      game.selectCategory(Category.Ones)
      expect(game.canUndo).toBe(true)
      game.roll()
      expect(game.canUndo).toBe(false)
    })

    it('undo clears undo state (cannot undo twice)', () => {
      const game = useGameStore()
      game.startGame(['Jussi'])
      game.roll()
      game.selectCategory(Category.Ones)
      game.undoLastCategory()
      expect(game.canUndo).toBe(false)
    })
  })
})
