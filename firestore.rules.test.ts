import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Firestore Security Rules — Dirty Dozen & Eight Pillars Verification', () => {
  const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

  it('1. Enforces rules_version = 2 and default-deny global safety net', () => {
    expect(rulesText).toContain("rules_version = '2';");
    expect(rulesText).toContain('match /{document=**}');
    expect(rulesText).toContain('allow read, write: if false;');
  });

  it('2. Blocks unverified email spoofing via email_verified == true check', () => {
    expect(rulesText).toContain('request.auth.token.email_verified == true');
  });

  it('3. Enforces Path ID poisoning guard via isValidId regex and length limit', () => {
    expect(rulesText).toContain("id.matches('^[a-zA-Z0-9_\\\\-]+$')");
    expect(rulesText).toContain('id.size() <= 128');
  });

  it('4. Blocks shadow field injection on create and update using hasAll, hasOnly, and affectedKeys', () => {
    expect(rulesText).toContain("data.keys().hasAll(['ownerId', 'orderNumber', 'orderType', 'status', 'totalAmount', 'idempotencyKey', 'createdAt', 'updatedAt'])");
    expect(rulesText).toContain("data.keys().hasOnly(['ownerId', 'orderNumber', 'orderType', 'status', 'totalAmount', 'idempotencyKey', 'createdAt', 'updatedAt'])");
    expect(rulesText).toContain("incoming().diff(existing()).affectedKeys().hasOnly(['status', 'totalAmount', 'updatedAt'])");
  });

  it('5. Enforces Ownership Integrity on create and immutability on update', () => {
    expect(rulesText).toContain('data.ownerId == request.auth.uid');
    expect(rulesText).toContain('incoming().ownerId == existing().ownerId');
  });

  it('6. Enforces Server Timestamp Temporal Integrity on createdAt and updatedAt', () => {
    expect(rulesText).toContain('incoming().createdAt == request.time');
    expect(rulesText).toContain('incoming().updatedAt == request.time');
    expect(rulesText).toContain('incoming().createdAt == existing().createdAt');
  });

  it('7. Enforces Terminal State Locking on COMPLETED and CANCELLED orders', () => {
    expect(rulesText).toContain("!(existing().status in ['COMPLETED', 'CANCELLED'])");
  });

  it('8. Enforces Query Enforcer on list without get() or exists() calls', () => {
    expect(rulesText).toContain('allow list: if isVerified() && (existing().ownerId == request.auth.uid || isBootstrappedAdmin());');
  });
});
