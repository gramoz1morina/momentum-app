const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clubDay, suggestSession, addCheckins, correctCheckin } = require('../src/checkin.cjs');
const now = new Date('2026-09-14T16:00:00Z'); // 18:00 Stockholm
const sessions = [
  { id: 'a', date: '2026-09-14', start: '17:30', end: '19:00' },
  { id: 'b', date: '2026-09-14', start: '19:00', end: '20:00' },
  { id: 'tomorrow', date: '2026-09-15', start: '17:30', end: '19:00' },
];
const options = { memberId: 'm', sessions, scanId: 'scan1', now };
test('Stockholm day works across UTC midnight and daylight savings', () => {
  assert.equal(clubDay(new Date('2026-09-14T22:30:00Z')), '2026-09-15');
  assert.equal(clubDay(new Date('2026-01-14T23:30:00Z')), '2026-01-15');
});
test('ongoing first, then next start, no automatic completed class', () => {
  assert.equal(suggestSession(sessions, now).id, 'a');
  assert.equal(suggestSession(sessions, new Date('2026-09-14T15:00:00Z')).id, 'a');
  assert.equal(suggestSession(sessions, new Date('2026-09-14T17:00:00Z')).id, 'b');
  assert.equal(suggestSession(sessions, new Date('2026-09-14T20:00:00Z')), null);
});
test('one row per member and specific session; rescans are idempotent', () => {
  const rows = addCheckins([], { ...options, sessionIds: ['a', 'b', 'a'] });
  assert.equal(rows.length, 2);
  assert.equal(addCheckins(rows, { ...options, scanId: 'scan2', sessionIds: ['a'] }).length, 2);
});
test('reject tomorrow, unknown and cancelled sessions', () => {
  for (const id of ['tomorrow', 'missing']) assert.throws(() => addCheckins([], { ...options, sessionIds: [id] }));
  assert.throws(() => addCheckins([], { ...options, sessions: sessions.map(s => ({ ...s, cancelled: true })), sessionIds: ['a'] }));
});
test('correction replaces one row without removing another member', () => {
  let rows = addCheckins([], { ...options, sessionIds: ['a'] });
  rows = addCheckins(rows, { ...options, memberId: 'other', sessionIds: ['a'] });
  rows = correctCheckin(rows, { ...options, oldSessionId: 'a', newSessionId: 'b' });
  assert.deepEqual(rows.map(r => [r.memberId, r.sessionId]), [['other', 'a'], ['m', 'b']]);
});
test('correcting to an already checked-in class does not double count', () => {
  const rows = addCheckins([], { ...options, sessionIds: ['a', 'b'] });
  assert.equal(correctCheckin(rows, { ...options, oldSessionId: 'a', newSessionId: 'b' }).length, 1);
});
