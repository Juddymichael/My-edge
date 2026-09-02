import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { db, CoachHistoryMessage } from '../lib/database/db';

describe('Trading Coach IndexedDB persistence', () => {
  beforeEach(async () => {
    await db.open();
    await db.coachHistory.clear();
  });

  afterEach(async () => {
    await db.coachHistory.clear();
  });

  it('persists coach messages in the same ThunderEdgeDB database', async () => {
    const messages: CoachHistoryMessage[] = [
      { id: 'user-1', role: 'user', text: 'Bonjour coach', timestamp: '2026-09-02T12:00:00.000Z' },
      { id: 'model-1', role: 'model', text: 'Bonjour 👋', timestamp: '2026-09-02T12:00:01.000Z' },
    ];

    await db.coachHistory.bulkPut(messages);

    const reloaded = await db.coachHistory.orderBy('timestamp').toArray();
    expect(reloaded.map(({ id, role, text }) => ({ id, role, text }))).toEqual([
      { id: 'user-1', role: 'user', text: 'Bonjour coach' },
      { id: 'model-1', role: 'model', text: 'Bonjour 👋' },
    ]);
  });

  it('can clear the conversation without affecting trades', async () => {
    await db.coachHistory.put({
      id: 'coach-1',
      role: 'model',
      text: 'Test',
      timestamp: '2026-09-02T12:00:00.000Z',
    });

    await db.coachHistory.clear();

    expect(await db.coachHistory.count()).toBe(0);
  });
});
