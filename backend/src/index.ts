import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { env } from "./env.js";
import { prisma } from "./lib/prisma.js";
import { socketService } from "./services/socket.service.js";
import { soundcloudService } from "./services/soundcloud.service.js";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Initialize socket service with the Socket.IO server
socketService.initialize(io);

app.use(cors());
app.use(express.json());

/**
 * Clean up stale database entries on server startup.
 * Removes all parties, players, songs, and related data older than 1 hour
 * or any incomplete/abandoned sessions.
 */
async function cleanupStaleData(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  try {
    // Delete all data in correct order (respecting foreign keys)
    // 1. Delete predictions
    await prisma.roundPrediction.deleteMany({});
    
    // 2. Delete player power-ups
    await prisma.playerPowerUp.deleteMany({});
    
    // 3. Delete active events
    await prisma.activeEvent.deleteMany({});
    
    // 4. Delete player achievements
    await prisma.playerAchievement.deleteMany({});
    
    // 5. Delete votes
    await prisma.vote.deleteMany({});
    
    // 6. Delete bonus results
    await prisma.bonusResult.deleteMany({});
    
    // 7. Delete songs
    await prisma.song.deleteMany({});
    
    // 8. Delete rounds
    await prisma.round.deleteMany({});
    
    // 9. Delete identities
    await prisma.partyIdentity.deleteMany({});
    
    // 10. Delete players
    await prisma.player.deleteMany({});
    
    // 11. Delete parties older than 1 hour
    const deletedParties = await prisma.party.deleteMany({
      where: {
        createdAt: { lt: oneHourAgo }
      }
    });
    
    // Also delete any parties that have no players (abandoned)
    const abandonedParties = await prisma.party.deleteMany({
      where: {
        players: { none: {} }
      }
    });
    
    const totalDeleted = deletedParties.count + abandonedParties.count;
    if (totalDeleted > 0) {
      console.log(`Cleaned up ${totalDeleted} stale/abandoned parties`);
    }
  } catch (error) {
    console.error('Error during startup cleanup:', error);
  }
}

/**
 * Full database reset - clears ALL data for a completely fresh start.
 * Called on server startup to ensure clean state.
 */
async function resetDatabase(): Promise<void> {
  try {
    // Delete all data in correct order (respecting foreign keys)
    await prisma.roundPrediction.deleteMany({});
    await prisma.playerPowerUp.deleteMany({});
    await prisma.activeEvent.deleteMany({});
    await prisma.playerAchievement.deleteMany({});
    await prisma.vote.deleteMany({});
    await prisma.bonusResult.deleteMany({});
    await prisma.song.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.partyIdentity.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.party.deleteMany({});
    
    console.log('Database reset complete - fresh start');
  } catch (error) {
    console.error('Error during database reset:', error);
  }
}

// Health check
app.get("/health", async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// SoundCloud search endpoint
app.get("/api/soundcloud/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    if (!query) {
      return res.status(400).json({ error: "Search query required" });
    }

    const tracks = await soundcloudService.searchTracks(query, limit);
    res.json({ tracks });
  } catch (error: any) {
    console.error("Search error:", error);
    
    // Return appropriate status code based on error
    const statusCode = error.code === 'SOUNDCLOUD_API_ERROR' && error.message?.includes('Rate limit') 
      ? 429 
      : 500;
    
    res.status(statusCode).json({
      error: error.message || "Search failed",
      code: error.code || "SEARCH_ERROR"
    });
  }
});

// Socket.IO connection handling
io.on("connection", async (socket) => {
  // Delegate connection handling to socket service
  await socketService.handleConnection(socket);

  // Lobby events
  socket.on("lobby:create", async (data) => {
    await socketService.handleLobbyCreate(socket, data);
  });

  socket.on("lobby:join", async (data) => {
    await socketService.handleLobbyJoin(socket, data);
  });

  socket.on("lobby:settings_updated", async (data) => {
    await socketService.handleLobbySettingsUpdated(socket, data);
  });

  socket.on("lobby:start", async () => {
    await socketService.handleLobbyStart(socket);
  });

  socket.on("lobby:kick", async (data) => {
    await socketService.handleLobbyKick(socket, data);
  });

  // Submission events
  socket.on("submission:submit", async (data) => {
    await socketService.handleSubmissionSubmit(socket, data);
  });

  socket.on("submission:remove", async (data) => {
    await socketService.handleSubmissionRemove(socket, data);
  });

  socket.on("submission:ready", async () => {
    await socketService.handleSubmissionReady(socket);
  });

  socket.on("submission:search", async (data) => {
    await socketService.handleSubmissionSearch(socket, data);
  });

  // Playing events
  socket.on("playing:vote", async (data) => {
    await socketService.handlePlayingVote(socket, data);
  });

  socket.on("playing:lock_vote", async (data) => {
    await socketService.handlePlayingLockVote(socket, data);
  });

  // State sync for reconnection - handled by socket service
  socket.on("state:sync_request", async () => {
    // Get player by socket ID and trigger reconnection flow
    const player = await socketService.getPlayerBySocketId(socket.id);
    if (player) {
      // Re-emit game state to the player
      socketService.sendToPlayer(socket.id, "state:synced", {
        message: "State sync requested - use connection:reconnect for full session restoration"
      });
    }

  });
});

// Export for testing
export { app, server, io, prisma };

// Start server only if not in test environment
if (process.env.NODE_ENV !== "test") {
  // Reset database on startup for clean state
  resetDatabase().then(() => {
    // Initialize SoundCloud service
    soundcloudService.initialize().catch((error) => {
      console.warn("SoundCloud initialization failed:", error.message);
      console.warn("SoundCloud search will not be available");
    });

    server.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  });
}
