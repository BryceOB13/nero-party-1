-- CreateTable
CREATE TABLE "RoundPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "partyId" TEXT NOT NULL,
    "predictions" TEXT NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedAt" DATETIME,
    CONSTRAINT "RoundPrediction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoundPrediction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RoundPrediction_playerId_idx" ON "RoundPrediction"("playerId");

-- CreateIndex
CREATE INDEX "RoundPrediction_partyId_idx" ON "RoundPrediction"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundPrediction_playerId_partyId_roundNumber_key" ON "RoundPrediction"("playerId", "partyId", "roundNumber");
