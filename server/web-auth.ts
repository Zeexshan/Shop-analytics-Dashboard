import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { webUsers } from '@shared/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql);
}

function hashLicenseKey(licenseKey: string): string {
  const salt = process.env.LICENSE_HASH_SALT || 'default_salt';
  return crypto.createHash('sha256').update(licenseKey + salt).digest('hex');
}

export async function findWebUserByLicenseKey(licenseKey: string) {
  const db = getDb();
  const hash = hashLicenseKey(licenseKey);
  const results = await db.select().from(webUsers).where(eq(webUsers.licenseKeyHash, hash));
  return results[0] || null;
}

export async function findWebUserByEmail(email: string) {
  const db = getDb();
  const results = await db.select().from(webUsers).where(eq(webUsers.email, email.toLowerCase()));
  return results[0] || null;
}

export async function createWebUser(licenseKey: string, email: string, password: string) {
  const db = getDb();
  const hash = hashLicenseKey(licenseKey);
  const passwordHash = await bcrypt.hash(password, 12);

  const results = await db.insert(webUsers).values({
    licenseKeyHash: hash,
    email: email.toLowerCase(),
    passwordHash,
  }).returning();

  return results[0];
}

export async function updateWebUserPassword(email: string, newPassword: string) {
  const db = getDb();
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(webUsers)
    .set({ passwordHash })
    .where(eq(webUsers.email, email.toLowerCase()));
}

export async function verifyWebUserPassword(email: string, password: string): Promise<boolean> {
  const user = await findWebUserByEmail(email);
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}
