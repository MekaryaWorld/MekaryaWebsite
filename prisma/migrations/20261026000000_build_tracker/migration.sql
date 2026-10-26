-- CreateTable
CREATE TABLE "Build" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "project" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waitlist',
    "revisionRound" INTEGER NOT NULL DEFAULT 0,
    "optionalStages" TEXT NOT NULL DEFAULT '',
    "emailUpdates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BuildUpdate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buildId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "emailedAt" DATETIME,
    "emailError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuildUpdate_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Build_code_key" ON "Build"("code");

-- CreateIndex
CREATE INDEX "Build_shop_status_idx" ON "Build"("shop", "status");

-- CreateIndex
CREATE INDEX "Build_shop_email_idx" ON "Build"("shop", "email");

-- CreateIndex
CREATE INDEX "BuildUpdate_buildId_idx" ON "BuildUpdate"("buildId");
