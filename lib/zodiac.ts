export function getZodiacSign(date: Date): { sign: string; emoji: string } {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: "Овен", emoji: "♈" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: "Телец", emoji: "♉" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: "Близнецы", emoji: "♊" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: "Рак", emoji: "♋" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: "Лев", emoji: "♌" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: "Дева", emoji: "♍" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: "Весы", emoji: "♎" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: "Скорпион", emoji: "♏" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: "Стрелец", emoji: "♐" };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: "Козерог", emoji: "♑" };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: "Водолей", emoji: "♒" };
  return { sign: "Рыбы", emoji: "♓" };
}

export function getNumerologyNumber(date: Date): number {
  const digits = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;
  let sum = digits.split("").reduce((acc, d) => acc + parseInt(d, 10), 0);
  while (sum > 9 && sum !== 11 && sum !== 22) {
    sum = sum.toString().split("").reduce((acc, d) => acc + parseInt(d, 10), 0);
  }
  return sum;
}
