export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomFloat(min, max) {
  const multipliedMin = min * 100;
  const multipliedMax = max * 100;
  const randomDifference = Math.random() * (multipliedMax - multipliedMin);
  const shiftedRandom = randomDifference + multipliedMin;
  const result = shiftedRandom / 100;
  return result;
}
