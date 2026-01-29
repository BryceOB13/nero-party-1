-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyId" TEXT NOT NULL,
    "bonusPoints" INTEGER NOT NULL,
    CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayerAchievement_playerId_idx" ON "PlayerAchievement"("playerId");

-- CreateIndex
CREATE INDEX "PlayerAchievement_partyId_idx" ON "PlayerAchievement"("partyId");
