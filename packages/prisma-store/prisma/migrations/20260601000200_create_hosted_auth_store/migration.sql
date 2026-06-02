CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "auth_users" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(191),
    "email" VARCHAR(320),
    "avatarUrl" VARCHAR(1024),
    "registrationChannel" VARCHAR(32) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

CREATE TABLE "auth_accounts" (
    "id" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "providerAccountId" VARCHAR(191) NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "email" VARCHAR(320),
    "metadata" JSONB NOT NULL,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_accounts_userId_idx" ON "auth_accounts"("userId");

CREATE UNIQUE INDEX "auth_accounts_provider_providerAccountId_key"
    ON "auth_accounts"("provider", "providerAccountId");

CREATE TABLE "auth_sessions" (
    "id" VARCHAR(64) NOT NULL,
    "clientId" VARCHAR(191) NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "providerAccountId" VARCHAR(191) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

ALTER TABLE "auth_accounts"
    ADD CONSTRAINT "auth_accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "auth_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "auth_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
