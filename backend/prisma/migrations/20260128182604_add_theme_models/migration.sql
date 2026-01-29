-- CreateTable
CREATE TABLE "PartyTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "RoundTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "votingPrompt" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "bonusMultiplier" REAL NOT NULL DEFAULT 1.0
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "themeId" TEXT,
    CONSTRAINT "Round_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "RoundTheme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "hostId" TEXT NOT NULL,
    "isDemoMode" BOOLEAN NOT NULL DEFAULT false,
    "settings" TEXT NOT NULL DEFAULT '{"songsPerPlayer":2,"playDuration":45,"submissionTimerMinutes":null,"enableConfidenceBetting":true,"enableProgressiveWeighting":true,"bonusCategoryCount":2}',
    "partyThemeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Party_partyThemeId_fkey" FOREIGN KEY ("partyThemeId") REFERENCES "PartyTheme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "partyId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "socketId" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartyIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "silhouette" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "revealedAt" DATETIME,
    "revealOrder" INTEGER,
    CONSTRAINT "PartyIdentity_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyIdentity_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "soundcloudId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "artworkUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "permalinkUrl" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "queuePosition" INTEGER NOT NULL DEFAULT 0,
    "roundId" TEXT,
    "rawAverage" REAL,
    "weightedScore" REAL,
    "confidenceModifier" REAL,
    "finalScore" REAL,
    "voteDistribution" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Song_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Song_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Song_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "songId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "votedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" DATETIME,
    "themeAdherenceRating" INTEGER,
    CONSTRAINT "Vote_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonusResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "winningSongId" TEXT NOT NULL,
    "winnerPlayerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "revealOrder" INTEGER NOT NULL,
    CONSTRAINT "BonusResult_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BonusResult_winningSongId_fkey" FOREIGN KEY ("winningSongId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BonusResult_winnerPlayerId_fkey" FOREIGN KEY ("winnerPlayerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Round_partyId_idx" ON "Round"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Party_code_key" ON "Party"("code");

-- CreateIndex
CREATE INDEX "Party_code_idx" ON "Party"("code");

-- CreateIndex
CREATE INDEX "Player_partyId_idx" ON "Player"("partyId");

-- CreateIndex
CREATE INDEX "Player_socketId_idx" ON "Player"("socketId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyIdentity_playerId_key" ON "PartyIdentity"("playerId");

-- CreateIndex
CREATE INDEX "PartyIdentity_partyId_idx" ON "PartyIdentity"("partyId");

-- CreateIndex
CREATE INDEX "Song_partyId_idx" ON "Song"("partyId");

-- CreateIndex
CREATE INDEX "Song_submitterId_idx" ON "Song"("submitterId");

-- CreateIndex
CREATE INDEX "Song_roundId_idx" ON "Song"("roundId");

-- CreateIndex
CREATE INDEX "Vote_songId_idx" ON "Vote"("songId");

-- CreateIndex
CREATE INDEX "Vote_voterId_idx" ON "Vote"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_songId_voterId_key" ON "Vote"("songId", "voterId");

-- CreateIndex
CREATE INDEX "BonusResult_partyId_idx" ON "BonusResult"("partyId");
