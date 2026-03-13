"use client";

import { extractSkills } from "./matching";

export interface ParsedResume {
  candidate_name: string;
  email: string;
  phone: string;
  skills: string[];
  experience_years: number;
  education: string;
  position: string;
  raw_text: string;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as any[];

    // Группируем по строкам (по Y-позиции)
    const lineMap = new Map<number, { x: number; str: string }[]>();
    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x: item.transform[4], str: item.str });
    }

    // Сортируем строки сверху вниз, внутри строки — слева направо
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const chunks = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const line = chunks.map((c) => c.str).join(" ").trim();
      if (line) lines.push(line);
    }

    if (i < pdf.numPages) lines.push("---PAGE_BREAK---");
  }

  return lines.join("\n");
}

/**
 * Парсит резюме формата HH.ru (HeadHunter)
 * Типичная структура:
 *   Имя Фамилия
 *   Желаемая должность
 *   Контакты (телефон, email)
 *   Опыт работы — X лет Y месяцев
 *   Список мест работы
 *   Образование
 *   Ключевые навыки
 */
export function parseHHResume(text: string): ParsedResume {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  let candidate_name = "";
  let email = "";
  let phone = "";
  let position = "";
  let education = "";
  let experience_years = 0;

  // === ИМЯ ===
  // В HH обычно имя — первая строка или после "Резюме обновлено"
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    // Пропускаем служебные строки HH
    if (/резюме обновлено|headhunter|hh\.ru|pdf|^\d{1,2}\s/i.test(line)) continue;
    // Имя: 2-3 слова с заглавных букв (кириллица или латиница)
    if (/^[A-ZА-ЯЁ][a-zа-яё]+\s+[A-ZА-ЯЁ][a-zа-яё]+/.test(line) && line.split(/\s+/).length <= 4) {
      candidate_name = line;
      // Следующая строка обычно — желаемая должность
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (!/^[+\d(]/.test(next) && !/@/.test(next) && !/резюме|обновлено|hh/i.test(next)) {
          position = next;
        }
      }
      break;
    }
  }

  // === EMAIL ===
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) email = emailMatch[0];

  // === ТЕЛЕФОН ===
  const phoneMatch = text.match(/(\+7|8)[\s\-()]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/)
    || text.match(/(\+\d[\d\s\-()]{9,15})/);
  if (phoneMatch) phone = phoneMatch[0].replace(/\s+/g, " ").trim();

  // === ОПЫТ РАБОТЫ (годы) ===
  // HH формат: "Опыт работы — 5 лет 3 месяца" или "Опыт работы 5 лет"
  const expPatterns = [
    /опыт\s*работы\s*[—\-–:]\s*(\d+)\s*(?:год|лет|года)/i,
    /опыт\s*работы\s*(\d+)\s*(?:год|лет|года)/i,
    /(\d+)\s*(?:год|лет|года)\s*(?:\d+\s*месяц)?\s*опыт/i,
    /experience\s*[:\-—]\s*(\d+)\s*year/i,
  ];
  for (const pat of expPatterns) {
    const m = text.match(pat);
    if (m) {
      experience_years = parseInt(m[1], 10);
      break;
    }
  }

  // Если не нашли — считаем по датам работы
  if (experience_years === 0) {
    const yearRanges = text.match(/(?:январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-яё]*\s+(\d{4})/gi);
    if (yearRanges && yearRanges.length >= 2) {
      const years = yearRanges.map((m) => {
        const ym = m.match(/(\d{4})/);
        return ym ? parseInt(ym[1], 10) : 0;
      }).filter((y) => y > 1990);
      if (years.length >= 2) {
        const minYear = Math.min.apply(null, years);
        const maxYear = Math.max.apply(null, years);
        experience_years = maxYear - minYear;
      }
    }
  }

  // Если всё ещё 0 — попробуем "по настоящее время" + стартовый год
  if (experience_years === 0) {
    const nowMatch = text.match(/(\d{4})\s*[—\-–]\s*(?:по\s*)?(?:настоящее|наст\.|н\.в|present)/i);
    if (nowMatch) {
      const startYear = parseInt(nowMatch[1], 10);
      experience_years = new Date().getFullYear() - startYear;
    }
  }

  // === ОБРАЗОВАНИЕ ===
  // HH формат: секция "Образование" с названием вуза, степенью
  const eduSection = text.match(/(?:образование|education)\s*[:\n]([\s\S]*?)(?=(?:ключевые навыки|навыки|опыт работы|повышение квалификации|сертификат|знание языков|дополнительн|$))/i);
  if (eduSection) {
    const eduText = eduSection[1].trim();
    const eduLines = eduText.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);
    // Берём первые значимые строки
    const meaningful = eduLines
      .filter((l) => !/^\d{4}$/.test(l) && !/^---/.test(l))
      .slice(0, 3);
    education = meaningful.join(", ");
  }

  if (!education) {
    const degreeMatch = text.match(/(бакалавр|магистр|специалист|bachelor|master|phd|кандидат наук|доктор наук|высшее|среднее\s*специальное)[а-яё]*/i);
    if (degreeMatch) education = degreeMatch[0];
  }

  // === НАВЫКИ ===
  // HH формат: секция "Ключевые навыки" со списком через запятую/пробел
  let skills: string[] = [];
  const skillSection = text.match(/(?:ключевые\s*навыки|key\s*skills|навыки)\s*[:\n]([\s\S]*?)(?=(?:опыт работы|образование|обо мне|дополнительн|повышение|портфолио|рекомендац|знание языков|сертификат|$))/i);

  if (skillSection) {
    const skillText = skillSection[1];
    // HH часто разделяет навыки через запятую, точку с запятой или новые строки
    const rawSkills = skillText
      .split(/[,;\n•·●▪]/)
      .map((s) => s.replace(/---PAGE_BREAK---/g, "").trim())
      .filter((s) => s.length > 1 && s.length < 50 && !/^\d+$/.test(s));
    skills = rawSkills.map((s) => s.toLowerCase());
  }

  // Дополняем автоопределением из всего текста
  const autoSkills = extractSkills(text);
  for (const s of autoSkills) {
    if (!skills.includes(s)) skills.push(s);
  }

  // Убираем дубли
  skills = Array.from(new Set(skills.map((s) => s.toLowerCase().trim()).filter(Boolean)));

  // Обрезаем до 30 навыков максимум
  if (skills.length > 30) skills = skills.slice(0, 30);

  return {
    candidate_name,
    email,
    phone,
    skills,
    experience_years,
    education: education.slice(0, 200),
    position,
    raw_text: text,
  };
}
