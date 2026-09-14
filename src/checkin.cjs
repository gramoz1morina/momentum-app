const TIME_ZONE = 'Europe/Stockholm';
const VENUE_QR = 'momentum-if:checkin:demo:v1';

function clubDay(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function clubMinute(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  return Number(p.find(x => x.type === 'hour').value) * 60 + Number(p.find(x => x.type === 'minute').value);
}
const minute = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
function todaySessions(sessions, now = new Date()) {
  return sessions.filter(s => s.date === clubDay(now) && !s.cancelled).sort((a, b) => minute(a.start) - minute(b.start) || a.id.localeCompare(b.id));
}
function suggestSession(sessions, now = new Date()) {
  const today = todaySessions(sessions, now);
  const time = clubMinute(now);
  const ongoing = today.filter(s => minute(s.start) <= time && time < minute(s.end));
  if (ongoing.length) return ongoing.sort((a, b) => minute(b.start) - minute(a.start) || a.id.localeCompare(b.id))[0];
  return today.find(s => minute(s.start) >= time) || null;
}
function addCheckins(rows, { memberId, sessionIds, sessions, scanId, now = new Date() }) {
  const allowed = new Set(todaySessions(sessions, now).map(s => s.id));
  if (!memberId || !scanId || sessionIds.some(id => !allowed.has(id))) throw new Error('Ogiltig incheckning. Välj ett av dagens pass.');
  const next = [...rows];
  for (const sessionId of new Set(sessionIds)) {
    if (!next.some(r => r.memberId === memberId && r.sessionId === sessionId)) {
      next.push({ id: `${memberId}:${sessionId}`, memberId, sessionId, scanId, createdAt: now.toISOString() });
    }
  }
  return next;
}
function correctCheckin(rows, { memberId, oldSessionId, newSessionId, ...options }) {
  const remaining = rows.filter(r => !(r.memberId === memberId && r.sessionId === oldSessionId));
  return addCheckins(remaining, { ...options, memberId, sessionIds: [newSessionId] });
}
module.exports = { TIME_ZONE, VENUE_QR, clubDay, todaySessions, suggestSession, addCheckins, correctCheckin };
