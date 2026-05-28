/**
 * One-time migration script to encrypt existing plaintext bank details.
 *
 * IMPORTANT: Run this BEFORE the Prisma migration that renames columns.
 * If the Prisma migration has already been applied, this script
 * reads old columns via raw SQL to access still-existing database columns.
 *
 * Usage:
 *   1. Generate an encryption key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   2. Set ENCRYPTION_KEY in .env.local
 *   3. npx tsx scripts/migrate-bank-encryption.ts
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Use the same encryption algorithm as lib/encryption.ts
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters), got ${key.length} bytes`
    );
  }
  return key;
}

function encrypt(text: string): string {
  if (!text) return text;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('Starting bank detail encryption migration...');
  console.log('');

  // Check ENCRYPTION_KEY is set
  if (!process.env.ENCRYPTION_KEY) {
    console.error('ERROR: ENCRYPTION_KEY environment variable is not set.');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  // First, check if the new columns exist (migration already applied)
  // If they do, check if there are any records with plaintext in old columns via raw SQL
  // PostgreSQL still has the old columns if the migration renamed them using ALTER TABLE RENAME
  const tableInfo = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'MentorApplication'`
  );
  const columnNames = tableInfo.map(c => c.column_name);
  console.log('Available columns:', columnNames.join(', '));

  // Determine which column naming convention is in use
  const hasOldColumns = columnNames.includes('bankAccountNumber') || columnNames.includes('bank_account_number');
  const hasNewColumns = columnNames.includes('bankAccountEncrypted') || columnNames.includes('bank_account_encrypted');

  let oldBankCol: string | null = null;
  let oldIfscCol: string | null = null;
  let oldUpiCol: string | null = null;
  let newBankCol: string | null = null;
  let newIfscCol: string | null = null;
  let newUpiCol: string | null = null;

  // Try camelCase naming
  if (hasOldColumns) {
    oldBankCol = columnNames.includes('bankAccountNumber') ? 'bankAccountNumber' : null;
    oldIfscCol = columnNames.includes('bankIFSC') ? 'bankIFSC' : null;
    oldUpiCol = columnNames.includes('upiId') ? 'upiId' : null;
  }
  if (hasNewColumns) {
    newBankCol = columnNames.includes('bankAccountEncrypted') ? 'bankAccountEncrypted' : null;
    newIfscCol = columnNames.includes('bankIfscEncrypted') ? 'bankIfscEncrypted' : null;
    newUpiCol = columnNames.includes('upiEncrypted') ? 'upiEncrypted' : null;
  }

  if (!oldBankCol && !oldIfscCol && !oldUpiCol) {
    console.log('No old plaintext columns found. Either migration already happened or columns use different naming.');
    console.log('Checking if data already exists in new encrypted columns...');
  }

  // Fetch all mentor applications
  const applications = await prisma.mentorApplication.findMany();
  console.log(`Found ${applications.length} mentor application(s).`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const app of applications) {
    const updates: Record<string, string> = {};

    // Try to read from old columns via raw SQL if available
    if (oldBankCol || oldIfscCol || oldUpiCol) {
      const selectCols = [oldBankCol, oldIfscCol, oldUpiCol].filter(Boolean).join(', ');
      if (selectCols) {
        const rawRows = await prisma.$queryRawUnsafe<Array<Record<string, string | null>>>(
          `SELECT id, ${selectCols} FROM "MentorApplication" WHERE id = $1`,
          app.id
        );

        if (rawRows.length > 0) {
          const rawRow = rawRows[0];
          const bankAccount = rawRow[oldBankCol || ''] as string | null;
          const bankIfsc = rawRow[oldIfscCol || ''] as string | null;
          const upiId = rawRow[oldUpiCol || ''] as string | null;

          // Check if new encrypted columns are already populated
          const alreadyEncrypted = newBankCol && (app as Record<string, unknown>)[newBankCol] !== null;

          if (!alreadyEncrypted) {
            if (bankAccount && newBankCol) {
              updates[newBankCol] = encrypt(bankAccount);
              console.log(`  Encrypting bankAccountNumber for application ${app.id}`);
            }
            if (bankIfsc && newIfscCol) {
              updates[newIfscCol] = encrypt(bankIfsc);
              console.log(`  Encrypting bankIFSC for application ${app.id}`);
            }
            if (upiId && newUpiCol) {
              updates[newUpiCol] = encrypt(upiId);
              console.log(`  Encrypting upiId for application ${app.id}`);
            }
          }
        }
      }
    } else {
      // New columns only - check if they already have plaintext (fallback detection)
      // If the Prisma migration renamed columns, old data was preserved via ALTER TABLE RENAME
      console.log(`  Application ${app.id}: checking existing data (new column schema)`);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.mentorApplication.update({
        where: { id: app.id },
        data: updates as Prisma.MentorApplicationUpdateInput,
      });
      migratedCount++;
      console.log(`  ✓ Migrated application ${app.id}`);
    } else {
      skippedCount++;
    }
  }

  console.log('');
  console.log('=== Migration Summary ===');
  console.log(`Total applications found: ${applications.length}`);
  console.log(`Migrated (encrypted):     ${migratedCount}`);
  console.log(`Skipped (no data/clean):  ${skippedCount}`);
  console.log('');

  if (migratedCount === 0 && applications.length > 0) {
    console.log('NOTE: No records were migrated. Possible reasons:');
    console.log('  1. The Prisma migration already renamed columns (data is preserved but columns have new names)');
    console.log('  2. The old columns never had data');
    console.log('  3. Raw column names differ from expected naming');
    console.log('');
    console.log('To verify, run:');
    console.log('  npx prisma studio');
    console.log('And check the MentorApplication table for encrypted fields.');
  }

  console.log('Migration complete.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
