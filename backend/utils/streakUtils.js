function calculateStreaks(dates) {
  if (!dates || dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      completedToday: false
    };
  }

  // Convert to Date objects (YYYY-MM-DD)
  const completedDates = dates.map(d => new Date(d));
  completedDates.sort((a, b) => a - b);

  let longestStreak = 1;
  let currentStreak = 1;

  let today = new Date();
  today.setHours(0, 0, 0, 0);

  let lastDate = completedDates[completedDates.length - 1];
  lastDate.setHours(0, 0, 0, 0);

  // Check if completed today
  const completedToday = lastDate.getTime() === today.getTime();

  // Calculate longest streak
  let tempStreak = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const prev = completedDates[i - 1];
    const curr = completedDates[i];

    const diff =
      (curr - prev) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  // Calculate current streak
  currentStreak = completedToday ? 1 : 0;

  for (let i = completedDates.length - 1; i > 0; i--) {
    const diff =
      (completedDates[i] - completedDates[i - 1]) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
  current: currentStreak,
  longest: longestStreak,
  completedToday,
};

}

module.exports = { calculateStreaks };
