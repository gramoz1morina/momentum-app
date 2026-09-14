const { clubDay } = require('./checkin.cjs');
const member = { id: 'demo-alex', name: 'Alex Andersson', firstName: 'Alex', group: 'BJJ', since: 'januari 2023' };
const groups = ['BJJ', "Fit’N Fight", 'Kids', 'FYS', 'MMA'];
const timetable = {
  1: [["Fit’N Fight", '17:00', '18:00']],
  2: [['BJJ · Gi', '17:30', '19:00']],
  3: [['BJJ Kids', '17:00', '18:00']],
  4: [['BJJ · Gi', '17:30', '19:00']],
  5: [],
  6: [['No-Gi Sparring', '11:00', '12:00']],
  0: [['No-Gi', '18:00', '19:00'], ['FYS', '19:00', '20:00']],
};
function makeSessions(now = new Date()) {
  const today = clubDay(now);
  const result = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    const day = date.toISOString().slice(0, 10);
    (timetable[date.getUTCDay()] || []).forEach(([name, start, end], n) => result.push({ id: `${day}-regular-${n}`, date: day, name, start, end, extra: false }));
  }
  result.push({ id: `${today}-extra`, date: today, name: 'Öppen matta', start: '20:00', end: '21:00', extra: true });
  return result.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
}
module.exports = { member, groups, makeSessions };
