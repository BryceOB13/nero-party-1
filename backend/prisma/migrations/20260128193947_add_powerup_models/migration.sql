-- CreateTable
CREATE TABLE "PlayerPowerUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "powerUpId" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" DATETIME,
    "usedOnSongId" TEXT,
    CONSTRAINT "PlayerPowerUp_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerPowerUp_usedOnSongId_fkey" FOREIGN KEY ("usedOnSongId") REFERENCES "Song" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "partyId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "socketId" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "powerUpPoints" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Player_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("avatarUrl", "id", "isHost", "isReady", "joinedAt", "name", "partyId", "socketId", "status") SELECT "avatarUrl", "id", "isHost", "isReady", "joinedAt", "name", "partyId", "socketId", "status" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE INDEX "Player_partyId_idx" ON "Player"("partyId");
CREATE INDEX "Player_socketId_idx" ON "Player"("socketId");
CREATE TABLE "new_Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "songId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "votedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" DATETIME,
    "themeAdherenceRating" INTEGER,
    "superVote" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    CONSTRAINT "Vote_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vote" ("id", "isLocked", "lockedAt", "rating", "songId", "themeAdherenceRating", "votedAt", "voterId") SELECT "id", "isLocked", "lockedAt", "rating", "songId", "themeAdherenceRating", "votedAt", "voterId" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE INDEX "Vote_songId_idx" ON "Vote"("songId");
CREATE INDEX "Vote_voterId_idx" ON "Vote"("voterId");
CREATE UNIQUE INDEX "Vote_songId_voterId_key" ON "Vote"("songId", "voterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PlayerPowerUp_playerId_idx" ON "PlayerPowerUp"("playerId");
