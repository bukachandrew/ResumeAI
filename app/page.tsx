"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({ resumes: 0, requirements: 0, matches: 0 });

  useEffect(() => {
    async function load() {
      const [r1, r2, r3] = await Promise.all([
        supabase.from("resumes").select("id", { count: "exact", head: true }),
        supabase.from("requirements").select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        resumes: r1.count ?? 0,
        requirements: r2.count ?? 0,
        matches: r3.count ?? 0,
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Резюме", value: stats.resumes, href: "/resumes", desc: "База кандидатов" },
    { label: "Вакансии", value: stats.requirements, href: "/requirements", desc: "Требования к позициям" },
    { label: "Результаты подбора", value: stats.matches, href: "/match", desc: "Проведённые подборы" },
  ];

  return (
    <div className="container">
      <div className="page-header">
        <h1>AI Подбор кандидатов</h1>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {cards.map((c) => (
          <a key={c.label} href={c.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4 }}>{c.value}</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}>{c.label}</div>
              <div style={{ color: "var(--text2)", fontSize: 12 }}>{c.desc}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Как это работает</h3>
        <div style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.8, marginTop: 12 }}>
          <p><strong>1. Загрузите резюме</strong> — загрузите PDF или вставьте текст. Навыки определяются автоматически.</p>
          <p><strong>2. Создайте вакансию</strong> — укажите требования: навыки, опыт, образование.</p>
          <p><strong>3. Запустите подбор</strong> — система оценит и ранжирует всех кандидатов по совпадению.</p>
          <p><strong>4. Поиск</strong> — введите название вакансии и найдите подходящих кандидатов.</p>
        </div>
      </div>
    </div>
  );
}
