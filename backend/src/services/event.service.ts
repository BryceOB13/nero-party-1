import { prisma } from '../lib/prisma';
import {
  MiniEvent,
  ActiveEvent,
  EventTiming,
  EventEffectResult,
  MiniEventEffect,
  MINI_EVENTS,
  AppError,
  ClientErrorCode,
} from '../types';

/**
 * Frequency modifiers for mini-event probability calculation.
 * 
 * **Validates: Requirement 11.5**
 * - rare = 0.33 (5% base)
 * - normal = 1.0 (15% base)
 * - chaos = 2.0 (30% base)
 */
export const FREQUENCY_MODIFIERS: Record<string, number> = {
  rare: 0.33,
  normal: 1.0,
  chaos: 2.0,
};

/**
 * EventService handles mini-event triggering, effect application, and resolution.
 * 
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.5**
 * - 11.1: THE Mini_Event_System SHALL define events with id, name, description, icon, timing, effect, and probability
 * - 11.2: THE Mini_Event_System SHALL support event timings: pre-round, mid-round, post-round, and pre-finale
 * - 11.3: THE Mini_Event_System SHALL support event effects
 * - 11.5: THE Mini_Event_System SHALL support three frequency settings: rare (5%), normal (15%), and chaos (30%)
 */
export class EventService {
  /**
   * Gets all predefined mini-events.
   * 
   * **Validates: Requirements 11.1, 11.2**
   * - 11.1: THE Mini_Event_System SHALL define events with id, name, description, icon, timing, effect, and probability
   * - 11.2: THE Mini_Event_System SHALL support event timings: pre-round, mid-round, post-round, and pre-finale
   * 
   * @returns Array of predefined mini-events
   */
  getEvents(): MiniEvent[] {
    return MINI_EVENTS;
  }

  /**
   * Gets a specific mini-event by ID.
   * 
   * @param eventId - The ID of the event to retrieve
   * @returns The mini-event if found, null otherwise
   */
  getEvent(eventId: string): MiniEvent | null {
    return MINI_EVENTS.find(e => e.id === eventId) || null;
  }

  /**
   * Gets all mini-events for a specific timing.
   * 
   * @param timing - The event timing to filter by
   * @returns Array of mini-events with the specified timing
   */
  getEventsByTiming(timing: EventTiming): MiniEvent[] {
    return MINI_EVENTS.filter(e => e.timing === timing);
  }

  /**
   * Checks if an event should trigger based on probability and frequency settings.
   * Uses the event's base probability multiplied by the frequency modifier.
   * 
   * **Validates: Requirement 11.5**
   * - THE Mini_Event_System SHALL support three frequency settings: rare (5%), normal (15%), and chaos (30%)
   * 
   * **Property 12: Mini-Event Frequency Calculation**
   * For any party with mini-events enabled, the probability of an event triggering SHALL be
   * multiplied by the frequency modifier: rare = 0.33 (5% base), normal = 1.0 (15% base), chaos = 2.0 (30% base).
   * 
   * @param partyId - The ID of the party
   * @param timing - The event timing to check for
   * @param frequency - The frequency setting ('rare', 'normal', or 'chaos'), defaults to 'normal'
   * @returns The triggered event if one should occur, null otherwise
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async checkForEvent(
    partyId: string,
    timing: EventTiming,
    frequency: 'rare' | 'normal' | 'chaos' = 'normal'
  ): Promise<MiniEvent | null> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get events for this timing
    const eligibleEvents = this.getEventsByTiming(timing);

    if (eligibleEvents.length === 0) {
      return null;
    }

    // Get the frequency modifier
    const frequencyModifier = FREQUENCY_MODIFIERS[frequency] || 1.0;

    // Check each event's probability
    for (const event of eligibleEvents) {
      // Calculate adjusted probability
      const adjustedProbability = event.probability * frequencyModifier;

      // Roll the dice
      const roll = Math.random();

      if (roll < adjustedProbability) {
        return event;
      }
    }

    return null;
  }

  /**
   * Triggers an event and creates an ActiveEvent record in the database.
   * 
   * **Validates: Requirement 11.3**
   * - THE Mini_Event_System SHALL support event effects
   * 
   * **Property 11: Mini-Event Effect Application**
   * For any triggered mini-event, the effect SHALL be applied according to its type,
   * and the affected players and score changes SHALL be recorded in an ActiveEvent record.
   * 
   * @param partyId - The ID of the party
   * @param eventId - The ID of the event to trigger
   * @param roundNumber - Optional round number when the event was triggered
   * @param affectedPlayerIds - Optional array of player IDs affected by the event
   * @returns The created ActiveEvent record
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if event does not exist (EVENT_NOT_FOUND)
   */
  async triggerEvent(
    partyId: string,
    eventId: string,
    roundNumber?: number,
    affectedPlayerIds: string[] = []
  ): Promise<ActiveEvent> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Verify the event exists
    const event = this.getEvent(eventId);

    if (!event) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Event does not exist');
    }

    // Create the ActiveEvent record
    const activeEventRecord = await prisma.activeEvent.create({
      data: {
        partyId,
        eventId,
        roundNumber: roundNumber ?? null,
        affectedPlayers: JSON.stringify(affectedPlayerIds),
        resolved: false,
      },
    });

    return {
      id: activeEventRecord.id,
      partyId: activeEventRecord.partyId,
      eventId: activeEventRecord.eventId,
      triggeredAt: activeEventRecord.triggeredAt,
      roundNumber: activeEventRecord.roundNumber,
      affectedPlayers: JSON.parse(activeEventRecord.affectedPlayers),
      resolved: activeEventRecord.resolved,
    };
  }

  /**
   * Marks an event as resolved/complete.
   * 
   * @param activeEventId - The ID of the active event to resolve
   * @throws AppError if active event does not exist (INVALID_STATE)
   * @throws AppError if event is already resolved (INVALID_STATE)
   */
  async resolveEvent(activeEventId: string): Promise<void> {
    // Get the active event
    const activeEventRecord = await prisma.activeEvent.findUnique({
      where: { id: activeEventId },
    });

    if (!activeEventRecord) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Active event does not exist');
    }

    if (activeEventRecord.resolved) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Event has already been resolved');
    }

    // Mark as resolved
    await prisma.activeEvent.update({
      where: { id: activeEventId },
      data: { resolved: true },
    });
  }

  /**
   * Gets all active (unresolved) events for a party.
   * 
   * @param partyId - The ID of the party
   * @returns Array of active (unresolved) events
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async getActiveEvents(partyId: string): Promise<ActiveEvent[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get all unresolved events for the party
    const activeEventRecords = await prisma.activeEvent.findMany({
      where: {
        partyId,
        resolved: false,
      },
      orderBy: { triggeredAt: 'asc' },
    });

    return activeEventRecords.map(record => ({
      id: record.id,
      partyId: record.partyId,
      eventId: record.eventId,
      triggeredAt: record.triggeredAt,
      roundNumber: record.roundNumber,
      affectedPlayers: JSON.parse(record.affectedPlayers),
      resolved: record.resolved,
    }));
  }

  /**
   * Gets all events (including resolved) for a party.
   * 
   * @param partyId - The ID of the party
   * @returns Array of all events for the party
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async getEventHistory(partyId: string): Promise<ActiveEvent[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get all events for the party
    const activeEventRecords = await prisma.activeEvent.findMany({
      where: { partyId },
      orderBy: { triggeredAt: 'asc' },
    });

    return activeEventRecords.map(record => ({
      id: record.id,
      partyId: record.partyId,
      eventId: record.eventId,
      triggeredAt: record.triggeredAt,
      roundNumber: record.roundNumber,
      affectedPlayers: JSON.parse(record.affectedPlayers),
      resolved: record.resolved,
    }));
  }

  /**
   * Gets a specific active event by ID.
   * 
   * @param activeEventId - The ID of the active event
   * @returns The active event if found
   * @throws AppError if active event does not exist (INVALID_STATE)
   */
  async getActiveEvent(activeEventId: string): Promise<ActiveEvent> {
    const activeEventRecord = await prisma.activeEvent.findUnique({
      where: { id: activeEventId },
    });

    if (!activeEventRecord) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Active event does not exist');
    }

    return {
      id: activeEventRecord.id,
      partyId: activeEventRecord.partyId,
      eventId: activeEventRecord.eventId,
      triggeredAt: activeEventRecord.triggeredAt,
      roundNumber: activeEventRecord.roundNumber,
      affectedPlayers: JSON.parse(activeEventRecord.affectedPlayers),
      resolved: activeEventRecord.resolved,
    };
  }

  /**
   * Updates the affected players for an active event.
   * Useful when the effect is applied and we know which players were affected.
   * 
   * @param activeEventId - The ID of the active event
   * @param affectedPlayerIds - Array of player IDs affected by the event
   * @returns The updated active event
   * @throws AppError if active event does not exist (INVALID_STATE)
   */
  async updateAffectedPlayers(
    activeEventId: string,
    affectedPlayerIds: string[]
  ): Promise<ActiveEvent> {
    const activeEventRecord = await prisma.activeEvent.findUnique({
      where: { id: activeEventId },
    });

    if (!activeEventRecord) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Active event does not exist');
    }

    const updatedRecord = await prisma.activeEvent.update({
      where: { id: activeEventId },
      data: {
        affectedPlayers: JSON.stringify(affectedPlayerIds),
      },
    });

    return {
      id: updatedRecord.id,
      partyId: updatedRecord.partyId,
      eventId: updatedRecord.eventId,
      triggeredAt: updatedRecord.triggeredAt,
      roundNumber: updatedRecord.roundNumber,
      affectedPlayers: JSON.parse(updatedRecord.affectedPlayers),
      resolved: updatedRecord.resolved,
    };
  }

  /**
   * Calculates the adjusted probability for an event based on frequency setting.
   * This is a utility method for testing and debugging.
   * 
   * **Validates: Requirement 11.5**
   * - rare = 0.33 (5% base)
   * - normal = 1.0 (15% base)
   * - chaos = 2.0 (30% base)
   * 
   * @param baseProbability - The base probability of the event (0-1)
   * @param frequency - The frequency setting ('rare', 'normal', or 'chaos')
   * @returns The adjusted probability
   */
  calculateAdjustedProbability(
    baseProbability: number,
    frequency: 'rare' | 'normal' | 'chaos'
  ): number {
    const modifier = FREQUENCY_MODIFIERS[frequency] || 1.0;
    return baseProbability * modifier;
  }

  /**
   * Applies the effect of an active event based on its type.
   * 
   * **Validates: Requirements 11.3, 12.1-12.9**
   * - 11.3: THE Mini_Event_System SHALL support event effects
   * - 12.1: Golden Record - next song earns 2x points
   * - 12.2: Steal the Aux - last place steals 10% of leader's points
   * - 12.3: Score Swap - two random players swap scores
   * - 12.4: Underdog Bonus - last place gets 1.5x points this round
   * - 12.5: Double or Nothing - score 7+ doubles, under 5 gets zero
   * - 12.6: Immunity Idol - last place immune from losing points
   * - 12.7: Vote Leak - one random vote revealed after each song
   * - 12.8: Shuffle Chaos - remaining queue order randomized
   * - 12.9: Score Blackout - leaderboard hidden until finale
   * 
   * **Property 11: Mini-Event Effect Application**
   * For any triggered mini-event, the effect SHALL be applied according to its type,
   * and the affected players and score changes SHALL be recorded in an ActiveEvent record.
   * 
   * @param activeEventId - The ID of the active event to apply
   * @param context - Optional context for effect application (e.g., songId for score_multiplier)
   * @returns The result of applying the effect
   * @throws AppError if active event does not exist (INVALID_STATE)
   * @throws AppError if event definition does not exist (INVALID_STATE)
   */
  async applyEventEffect(
    activeEventId: string,
    context?: { songId?: string; songScore?: number }
  ): Promise<EventEffectResult> {
    // Get the active event
    const activeEvent = await this.getActiveEvent(activeEventId);
    
    // Get the event definition
    const event = this.getEvent(activeEvent.eventId);
    if (!event) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Event definition does not exist');
    }

    // Apply the effect based on type
    const effect = event.effect;
    let result: EventEffectResult;

    switch (effect.type) {
      case 'score_multiplier':
        result = await this.applyScoreMultiplierEffect(activeEvent, effect, context);
        break;
      case 'steal_points':
        result = await this.applyStealPointsEffect(activeEvent, effect);
        break;
      case 'swap_scores':
        result = await this.applySwapScoresEffect(activeEvent, effect);
        break;
      case 'double_or_nothing':
        result = await this.applyDoubleOrNothingEffect(activeEvent, effect, context);
        break;
      case 'immunity':
        result = await this.applyImmunityEffect(activeEvent, effect);
        break;
      case 'vote_reveal':
        result = await this.applyVoteRevealEffect(activeEvent, effect);
        break;
      case 'sabotage':
        result = await this.applySabotageEffect(activeEvent, effect);
        break;
      default:
        throw new AppError(ClientErrorCode.INVALID_STATE, `Unknown effect type: ${(effect as MiniEventEffect).type}`);
    }

    // Update affected players in the active event record
    await this.updateAffectedPlayers(activeEventId, result.affectedPlayers);

    return result;
  }

  /**
   * Applies score_multiplier effect (Golden Record, Underdog Bonus).
   * Multiplies the score for the target player(s).
   * 
   * **Validates: Requirements 12.1, 12.4**
   * - 12.1: Golden Record - next song earns 2x points (target: 'winner')
   * - 12.4: Underdog Bonus - last place gets 1.5x points (target: 'loser')
   * 
   * @param activeEvent - The active event record
   * @param effect - The score_multiplier effect configuration
   * @param context - Optional context with songId and songScore
   * @returns The effect result with affected players and score changes
   */
  private async applyScoreMultiplierEffect(
    activeEvent: ActiveEvent,
    effect: Extract<MiniEventEffect, { type: 'score_multiplier' }>,
    context?: { songId?: string; songScore?: number }
  ): Promise<EventEffectResult> {
    const scoreChanges: Record<string, number> = {};
    const affectedPlayers: string[] = [];

    // Get players sorted by score to determine positions
    const players = await this.getPlayersByScore(activeEvent.partyId);

    if (players.length === 0) {
      return {
        type: 'score_multiplier',
        affectedPlayers: [],
        scoreChanges: {},
        message: 'No players to apply multiplier to.',
      };
    }

    let targetPlayers: { id: string; score: number }[] = [];

    switch (effect.target) {
      case 'winner':
        // Target the player with the highest score (leader)
        targetPlayers = [players[0]];
        break;
      case 'loser':
        // Target the player with the lowest score (last place)
        targetPlayers = [players[players.length - 1]];
        break;
      case 'random':
        // Target a random player
        const randomIndex = Math.floor(Math.random() * players.length);
        targetPlayers = [players[randomIndex]];
        break;
      case 'all':
        // Target all players
        targetPlayers = players;
        break;
    }

    // If we have a song context, apply multiplier to that song's score
    if (context?.songId && context?.songScore !== undefined) {
      const song = await prisma.song.findUnique({
        where: { id: context.songId },
        select: { submitterId: true, finalScore: true },
      });

      if (song) {
        const bonusPoints = context.songScore * (effect.multiplier - 1);
        scoreChanges[song.submitterId] = bonusPoints;
        affectedPlayers.push(song.submitterId);

        return {
          type: 'score_multiplier',
          affectedPlayers,
          scoreChanges,
          message: `Applied ${effect.multiplier}x multiplier! Bonus: +${bonusPoints.toFixed(1)} points.`,
        };
      }
    }

    // Otherwise, apply multiplier to target players' total scores
    for (const player of targetPlayers) {
      const bonusPoints = player.score * (effect.multiplier - 1);
      scoreChanges[player.id] = bonusPoints;
      affectedPlayers.push(player.id);
    }

    const targetDescription = effect.target === 'all' 
      ? 'all players' 
      : effect.target === 'winner' 
        ? 'the leader' 
        : effect.target === 'loser' 
          ? 'last place' 
          : 'a random player';

    return {
      type: 'score_multiplier',
      affectedPlayers,
      scoreChanges,
      message: `Applied ${effect.multiplier}x multiplier to ${targetDescription}!`,
    };
  }

  /**
   * Applies steal_points effect (Steal the Aux).
   * Transfers points from one player to another.
   * 
   * **Validates: Requirement 12.2**
   * - 12.2: Steal the Aux - last place steals 10% of leader's points
   * 
   * @param activeEvent - The active event record
   * @param effect - The steal_points effect configuration
   * @returns The effect result with affected players and score changes
   */
  private async applyStealPointsEffect(
    activeEvent: ActiveEvent,
    effect: Extract<MiniEventEffect, { type: 'steal_points' }>
  ): Promise<EventEffectResult> {
    const scoreChanges: Record<string, number> = {};
    const affectedPlayers: string[] = [];

    // Get players sorted by score
    const players = await this.getPlayersByScore(activeEvent.partyId);

    if (players.length < 2) {
      return {
        type: 'steal_points',
        affectedPlayers: [],
        scoreChanges: {},
        message: 'Not enough players to steal points.',
      };
    }

    // Determine the source player (who loses points)
    let sourcePlayer: { id: string; score: number };
    if (effect.from === 'leader') {
      sourcePlayer = players[0]; // Highest score
    } else {
      // Random player (excluding last place who will receive)
      const randomIndex = Math.floor(Math.random() * (players.length - 1));
      sourcePlayer = players[randomIndex];
    }

    // Last place player receives the stolen points
    const receiverPlayer = players[players.length - 1];

    // Calculate points to steal
    let pointsToSteal: number;
    if (effect.amount === 'percentage' && effect.percentage !== undefined) {
      pointsToSteal = sourcePlayer.score * (effect.percentage / 100);
    } else if (typeof effect.amount === 'number') {
      pointsToSteal = Math.min(effect.amount, sourcePlayer.score);
    } else {
      pointsToSteal = 0;
    }

    // Round to 1 decimal place
    pointsToSteal = Math.round(pointsToSteal * 10) / 10;

    if (pointsToSteal > 0) {
      scoreChanges[sourcePlayer.id] = -pointsToSteal;
      scoreChanges[receiverPlayer.id] = pointsToSteal;
      affectedPlayers.push(sourcePlayer.id, receiverPlayer.id);
    }

    return {
      type: 'steal_points',
      affectedPlayers,
      scoreChanges,
      message: `Last place stole ${pointsToSteal} points from the leader!`,
    };
  }

  /**
   * Applies swap_scores effect (Score Swap).
   * Swaps total scores between two players.
   * 
   * **Validates: Requirement 12.3**
   * - 12.3: Score Swap - two random players swap scores
   * 
   * @param activeEvent - The active event record
   * @param effect - The swap_scores effect configuration
   * @returns The effect result with affected players and score changes
   */
  private async applySwapScoresEffect(
    activeEvent: ActiveEvent,
    effect: Extract<MiniEventEffect, { type: 'swap_scores' }>
  ): Promise<EventEffectResult> {
    const scoreChanges: Record<string, number> = {};
    const affectedPlayers: string[] = [];

    // Get players sorted by score
    const players = await this.getPlayersByScore(activeEvent.partyId);

    if (players.length < 2) {
      return {
        type: 'swap_scores',
        affectedPlayers: [],
        scoreChanges: {},
        message: 'Not enough players to swap scores.',
      };
    }

    let player1: { id: string; score: number };
    let player2: { id: string; score: number };

    switch (effect.players) {
      case 'adjacent':
        // Swap two adjacent players in the leaderboard
        const adjacentIndex = Math.floor(Math.random() * (players.length - 1));
        player1 = players[adjacentIndex];
        player2 = players[adjacentIndex + 1];
        break;
      case 'top_bottom':
        // Swap first and last place
        player1 = players[0];
        player2 = players[players.length - 1];
        break;
      case 'random_pair':
      default:
        // Swap two random players
        const indices = this.getRandomPairIndices(players.length);
        player1 = players[indices[0]];
        player2 = players[indices[1]];
        break;
    }

    // Calculate the score changes needed to swap
    const scoreDiff = player1.score - player2.score;
    scoreChanges[player1.id] = -scoreDiff;
    scoreChanges[player2.id] = scoreDiff;
    affectedPlayers.push(player1.id, player2.id);

    return {
      type: 'swap_scores',
      affectedPlayers,
      scoreChanges,
      message: `Two players swapped their scores!`,
    };
  }

  /**
   * Applies double_or_nothing effect.
   * Doubles score if >= 7, zeros if < 5.
   * 
   * **Validates: Requirement 12.5**
   * - 12.5: Double or Nothing - score 7+ doubles, under 5 gets zero
   * 
   * @param activeEvent - The active event record
   * @param effect - The double_or_nothing effect configuration
   * @param context - Context with songId and songScore
   * @returns The effect result with affected players and score changes
   */
  private async applyDoubleOrNothingEffect(
    activeEvent: ActiveEvent,
    effect: Extract<MiniEventEffect, { type: 'double_or_nothing' }>,
    context?: { songId?: string; songScore?: number }
  ): Promise<EventEffectResult> {
    const scoreChanges: Record<string, number> = {};
    const affectedPlayers: string[] = [];

    if (!context?.songId || context?.songScore === undefined) {
      return {
        type: 'double_or_nothing',
        affectedPlayers: [],
        scoreChanges: {},
        message: 'No song context provided for Double or Nothing.',
      };
    }

    const song = await prisma.song.findUnique({
      where: { id: context.songId },
      select: { submitterId: true, rawAverage: true },
    });

    if (!song) {
      return {
        type: 'double_or_nothing',
        affectedPlayers: [],
        scoreChanges: {},
        message: 'Song not found.',
      };
    }

    const rawScore = song.rawAverage ?? context.songScore;
    let modifier: number;
    let message: string;

    if (rawScore >= 7) {
      // Double the score
      modifier = context.songScore; // Add the same amount again (doubling)
      message = `Double or Nothing: Score ${rawScore.toFixed(1)} >= 7! Points DOUBLED! +${modifier.toFixed(1)}`;
    } else if (rawScore < 5) {
      // Zero the score
      modifier = -context.songScore; // Remove all points
      message = `Double or Nothing: Score ${rawScore.toFixed(1)} < 5! Points ZEROED!`;
    } else {
      // Score between 5 and 7 - no change
      modifier = 0;
      message = `Double or Nothing: Score ${rawScore.toFixed(1)} is between 5-7. No change.`;
    }

    if (modifier !== 0) {
      scoreChanges[song.submitterId] = modifier;
      affectedPlayers.push(song.submitterId);
    }

    return {
      type: 'double_or_nothing',
      affectedPlayers,
      scoreChanges,
      message,
    };
  }

  /**
   * Applies immunity effect (Immunity Idol).
   * Marks last place player as immune from point loss.
   * 
   * **Validates: Requirement 12.6**
   * - 12.6: Immunity Idol - last place immune from losing points
   * 
   * @param activeEvent - The active event record
   * @param effect - The immunity effect configuration
   * @returns The effect result with affected players
   */
  private async applyImmunityEffect(
    activeEvent: ActiveEvent,
    effect: Extract<MiniEventEffect, { type: 'immunity' }>
  ): Promise<EventEffectResult> {
    const affectedPlayers: string[] = [];

    // Get players sorted by score
    const players = await this.getPlayersByScore(activeEvent.partyId);

    if (players.length === 0) {
      return {
        type: 'immunity',
        affectedPlayers: [],
        scoreChanges: {},
        message: 'No players to grant immunity to.',
      };
    }

    // Grant immunity to last place
    if (effect.target === 'last_place') {
      const lastPlace = players[players.length - 1];
      affectedPlayers.push(lastPlace.id);
    }

    return {
      type: 'immunity',
      affectedPlayers,
      scoreChanges: {},
      message: `Last place has been granted immunity from point loss this round!`,
    };
  }

  /**
   * Applies vote_reveal effect (Vote Leak).
   * Reveals random votes after each song.
   * 
   * **Validates: Requirement 12.7**
   * - 12.7: Vote Leak - one random vote revealed after each song
   * 
   * @param activeEvent - The active event record
   * @param effect - The vote_reveal effect configuration
   * @returns The effect result with revealed vote information
   */
  private async applyVoteRevealEffect(
    activeEvent: ActiveEvent,
    effect: Extract<MiniEventEffect, { type: 'vote_reveal' }>
  ): Promise<EventEffectResult> {
    // Get all votes for the current round
    const songs = await prisma.song.findMany({
      where: {
        partyId: activeEvent.partyId,
        roundNumber: activeEvent.roundNumber ?? undefined,
      },
      include: {
        votes: {
          include: {
            voter: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Collect all votes
    const allVotes: { voterId: string; voterName: string; songTitle: string; rating: number }[] = [];
    for (const song of songs) {
      for (const vote of song.votes) {
        allVotes.push({
          voterId: vote.voterId,
          voterName: vote.voter.name,
          songTitle: song.title,
          rating: vote.rating,
        });
      }
    }

    // Select random votes to reveal
    const revealedVotes: typeof allVotes = [];
    const votesToReveal = Math.min(effect.count, allVotes.length);
    
    const shuffled = [...allVotes].sort(() => Math.random() - 0.5);
    for (let i = 0; i < votesToReveal; i++) {
      revealedVotes.push(shuffled[i]);
    }

    const affectedPlayers = [...new Set(revealedVotes.map(v => v.voterId))];

    return {
      type: 'vote_reveal',
      affectedPlayers,
      scoreChanges: {},
      message: `${votesToReveal} vote(s) have been leaked!`,
    };
  }

  /**
   * Applies sabotage effects (Shuffle Chaos, Score Blackout).
   * 
   * **Validates: Requirements 12.8, 12.9**
   * - 12.8: Shuffle Chaos - remaining queue order randomized
   * - 12.9: Score Blackout - leaderboard hidden until finale
   * 
   * @param activeEvent - The active event record
   * @param effect - The sabotage effect configuration
   * @returns The effect result
   */
  private async applySabotageEffect(
    activeEvent: ActiveEvent,
    effect: Extract<MiniEventEffect, { type: 'sabotage' }>
  ): Promise<EventEffectResult> {
    const affectedPlayers: string[] = [];

    switch (effect.effect) {
      case 'shuffle_queue':
        // Shuffle the remaining songs in the queue
        await this.shuffleRemainingQueue(activeEvent.partyId);
        return {
          type: 'sabotage',
          affectedPlayers: [],
          scoreChanges: {},
          message: 'The remaining song queue has been shuffled!',
        };

      case 'hide_scores':
        // Mark that scores should be hidden - this is handled by the frontend
        // Get all players to mark as affected
        const players = await prisma.player.findMany({
          where: { partyId: activeEvent.partyId },
          select: { id: true },
        });
        affectedPlayers.push(...players.map(p => p.id));
        
        return {
          type: 'sabotage',
          affectedPlayers,
          scoreChanges: {},
          message: 'Score Blackout! The leaderboard is hidden until the finale!',
        };

      case 'anonymous_voting':
        // Mark that voting should be anonymous - handled by frontend
        const allPlayers = await prisma.player.findMany({
          where: { partyId: activeEvent.partyId },
          select: { id: true },
        });
        affectedPlayers.push(...allPlayers.map(p => p.id));
        
        return {
          type: 'sabotage',
          affectedPlayers,
          scoreChanges: {},
          message: 'Anonymous voting is now active! Vote identities are hidden.',
        };

      default:
        return {
          type: 'sabotage',
          affectedPlayers: [],
          scoreChanges: {},
          message: 'Unknown sabotage effect.',
        };
    }
  }

  /**
   * Gets all players in a party sorted by their total score (descending).
   * 
   * @param partyId - The ID of the party
   * @returns Array of players with their IDs and total scores
   */
  private async getPlayersByScore(partyId: string): Promise<{ id: string; score: number }[]> {
    // Get all players with their songs
    const players = await prisma.player.findMany({
      where: { partyId },
      include: {
        submittedSongs: {
          select: { finalScore: true },
        },
      },
    });

    // Calculate total scores
    const playerScores = players.map(player => {
      const totalScore = player.submittedSongs.reduce(
        (sum, song) => sum + (song.finalScore ?? 0),
        0
      );
      return { id: player.id, score: totalScore };
    });

    // Sort by score descending (highest first)
    return playerScores.sort((a, b) => b.score - a.score);
  }

  /**
   * Gets two random distinct indices from an array.
   * 
   * @param length - The length of the array
   * @returns Tuple of two distinct indices
   */
  private getRandomPairIndices(length: number): [number, number] {
    const first = Math.floor(Math.random() * length);
    let second = Math.floor(Math.random() * (length - 1));
    if (second >= first) {
      second++;
    }
    return [first, second];
  }

  /**
   * Shuffles the remaining songs in the queue that haven't been played yet.
   * 
   * @param partyId - The ID of the party
   */
  private async shuffleRemainingQueue(partyId: string): Promise<void> {
    // Get all songs that haven't been scored yet (no finalScore)
    const unplayedSongs = await prisma.song.findMany({
      where: {
        partyId,
        finalScore: null,
      },
      orderBy: { queuePosition: 'asc' },
    });

    if (unplayedSongs.length <= 1) {
      return; // Nothing to shuffle
    }

    // Shuffle the queue positions
    const positions = unplayedSongs.map(s => s.queuePosition);
    const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);

    // Update each song with its new position
    const updates = unplayedSongs.map((song, index) =>
      prisma.song.update({
        where: { id: song.id },
        data: { queuePosition: shuffledPositions[index] },
      })
    );

    await prisma.$transaction(updates);
  }
}

// Export singleton instance
export const eventService = new EventService();
