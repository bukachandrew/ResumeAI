"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface HHResume {
  id: string;
  title: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  area?: { name: string };
  age?: number;
  gender?: { name: string };
  salary?: { amount: number; currency: string };
  total_experience?: { months: number };
  experience?: {
    company?: string;
    position?: string;
    start?: string;
    end?: string;
    description?: string;
  }[];
  education?: {
    level?: { name: string };
    primary?: { name: string; organization?: string; year?: number }[];
  };
  skill_set?: string[];
  certificate?: { title: string }[];
  alternate_url?: string;
  url?: string;
  photo?: { small?: string };
  // full details
  skills?: string;
}

const TOKEN_KEY = "hh_api_token";

export default function HHSearchPage() {
  const [query, setQuery] = useState("");
  const [resumes, setResumes] = useState<HHResume[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");

  const [token, setToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  function saveToken(t: string) {
    setToken(t);
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function handleSearch(newPage = 0) {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setErrorType("");

    try {
      const params = new URLSearchParams({ text: query, page: String(newPage) });
      if (token) params.set("token", token);

      const res = await fetch(`/api/hh/search?${params}`);
      const data = await res.json();

      if (data.error) {
        setErrorType(data.error);
        setError(data.message || "Ошибка API");
        setResumes([]);
        setTotalFound(0);
        setLoading(false);
        return;
      }

      setResumes(data.items || []);
      setTotalFound(data.found || 0);
      setTotalPages(data.pages || 0);
      setPage(newPage);
    } catch (err: any) {
      setError("Ошибка подключения");
      setErrorType("NETWORK");
    }

    setLoading(false);
  }

  function getFullName(r: HHResume): string {
    return [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(" ") || "Без имени";
  }

  function formatExpMonths(months: number): string {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts: string[] = [];
    if (y > 0) parts.push(`${y} ${y === 1 ? "год" : y < 5 ? "года" : "лет"}`);
    if (m > 0) parts.push(`${m} мес.`);
    return parts.join(" ") || "без опыта";
  }

  function formatSalary(salary: HHResume["salary"]): string {
    if (!salary || !salary.amount) return "";
    return `${salary.amount.toLocaleString()} ${salary.currency}`;
  }

  async function addToDatabase(r: HHResume) {
    setAdding(r.id);

    // Подгружаем детали, если есть токен
    let details: HHResume | null = null;
    if (token) {
      try {
        const res = await fetch(`/api/hh/resume?id=${r.id}&token=${encodeURIComponent(token)}`);
        if (res.ok) details = await res.json();
      } catch { /* ignore */ }
    }

    const fullName = getFullName(r);
    const skills = (details?.skill_set || r.skill_set || []).map((s) => s.toLowerCase());
    const expYears = r.total_experience ? Math.round(r.total_experience.months / 12) : 0;

    // Собираем education
    let education = "";
    const eduLevel = details?.education?.level?.name || r.education?.level?.name;
    const eduPrimary = details?.education?.primary || r.education?.primary;
    if (eduLevel) education = eduLevel;
    if (eduPrimary && eduPrimary.length > 0) {
      const first = eduPrimary[0];
      if (first.organization) education += (education ? ", " : "") + first.organization;
      if (first.name) education += (education ? ", " : "") + first.name;
    }

    // Собираем raw_text из всех полей
    const textParts: string[] = [];
    textParts.push(`${fullName}`);
    textParts.push(`Желаемая должность: ${r.title}`);
    if (r.area?.name) textParts.push(`Город: ${r.area.name}`);
    if (expYears > 0) textParts.push(`Опыт работы: ${formatExpMonths(r.total_experience?.months || 0)}`);
    if (education) textParts.push(`Образование: ${education}`);
    if (skills.length > 0) textParts.push(`Навыки: ${skills.join(", ")}`);

    const expList = details?.experience || r.experience || [];
    if (expList.length > 0) {
      textParts.push("\nОпыт работы:");
      for (const exp of expList) {
        const period = [exp.start, exp.end || "настоящее время"].filter(Boolean).join(" — ");
        textParts.push(`${exp.company || ""} — ${exp.position || ""} (${period})`);
        if (exp.description) textParts.push(exp.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
      }
    }

    if (r.alternate_url) textParts.push(`\nHH.kz: ${r.alternate_url}`);

    const rawText = textParts.join("\n");

    const { error } = await supabase.from("resumes").insert({
      candidate_name: fullName,
      email: "",
      phone: "",
      skills,
      experience_years: expYears,
      education: education.slice(0, 200),
      raw_text: rawText,
    });

    if (!error) {
      setAdded((prev) => {
        const next = new Set(prev);
        next.add(r.id);
        return next;
      });
    }

    setAdding(null);
  }

  const needsToken = errorType === "NO_TOKEN" || errorType === "UNAUTHORIZED" || errorType === "FORBIDDEN";

  return (
    <div className="container">
      <div className="page-header">
        <h1>Поиск резюме на HH.kz</h1>
        <button
          className="btn btn-sm"
          style={{ background: "var(--surface2)", color: token ? "var(--green)" : "var(--text2)" }}
          onClick={() => setShowTokenInput(!showTokenInput)}
        >
          {token ? "Токен подключён" : "Настроить токен"}
        </button>
      </div>

      {/* Настройка токена */}
      {showTokenInput && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 8 }}>API-токен HH.kz</h3>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12, lineHeight: 1.6 }}>
            Для поиска резюме нужен токен работодателя с HH.kz.<br />
            1. Зарегистрируйте приложение на <a href="https://dev.hh.kz/" target="_blank" rel="noopener noreferrer">dev.hh.kz</a><br />
            2. Получите токен с правами <code>search_resumes</code><br />
            3. Вставьте токен ниже — он сохранится в браузере
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              value={token}
              onChange={(e) => saveToken(e.target.value)}
              placeholder="Вставьте Bearer-токен..."
              style={{ flex: 1 }}
            />
            {token && (
              <button className="btn btn-danger btn-sm" onClick={() => { saveToken(""); }}>
                Удалить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Поисковая строка */}
      <div className="card" style={{ marginBottom: 24 }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(0); }}
          style={{ display: "flex", gap: 12, alignItems: "end" }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text2)" }}>
              Поиск резюме кандидатов на HeadHunter Казахстан
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: Python разработчик, Frontend React, бухгалтер, менеджер..."
              style={{ fontSize: 16, padding: 14 }}
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !query.trim()}
            style={{ padding: "14px 28px", fontSize: 15 }}
          >
            {loading ? "Поиск..." : "Найти резюме"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>
            {needsToken && !showTokenInput && (
              <button
                className="btn btn-sm"
                style={{ marginTop: 8, background: "var(--surface2)", color: "var(--accent)" }}
                onClick={() => setShowTokenInput(true)}
              >
                Настроить API-токен
              </button>
            )}
          </div>
        )}
      </div>

      {/* Счётчик результатов */}
      {totalFound > 0 && (
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 12 }}>
          Найдено резюме: {totalFound.toLocaleString()} | Страница {page + 1} из {totalPages}
        </p>
      )}

      {/* Карточки резюме */}
      {resumes.map((r) => (
        <div key={r.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              {/* Имя и должность */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                {r.photo?.small && (
                  <img
                    src={r.photo.small}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                  />
                )}
                <div>
                  <h3 style={{ margin: 0 }}>
                    {r.alternate_url ? (
                      <a href={r.alternate_url} target="_blank" rel="noopener noreferrer">
                        {getFullName(r)}
                      </a>
                    ) : (
                      getFullName(r)
                    )}
                  </h3>
                  <div style={{ fontSize: 14, color: "var(--accent)" }}>{r.title}</div>
                </div>
              </div>

              {/* Мета-информация */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
                {r.area?.name && (
                  <span className="tag tag-gray">{r.area.name}</span>
                )}
                {r.total_experience && r.total_experience.months > 0 && (
                  <span className="tag tag-blue">{formatExpMonths(r.total_experience.months)}</span>
                )}
                {r.salary && formatSalary(r.salary) && (
                  <span className="tag tag-green">{formatSalary(r.salary)}</span>
                )}
                {r.age && (
                  <span className="tag tag-gray">{r.age} лет</span>
                )}
                {r.education?.level?.name && (
                  <span className="tag tag-gray">{r.education.level.name}</span>
                )}
              </div>

              {/* Навыки */}
              {r.skill_set && r.skill_set.length > 0 && (
                <div className="tags" style={{ marginBottom: 8 }}>
                  {r.skill_set.slice(0, 15).map((s, i) => (
                    <span key={i} className="tag tag-yellow">{s}</span>
                  ))}
                  {r.skill_set.length > 15 && (
                    <span className="tag tag-gray">+{r.skill_set.length - 15}</span>
                  )}
                </div>
              )}

              {/* Развёрнутый опыт */}
              {expandedId === r.id && r.experience && r.experience.length > 0 && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: "var(--surface2)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Опыт работы:</div>
                  {r.experience.map((exp, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < r.experience!.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ fontWeight: 500 }}>{exp.position}</div>
                      <div style={{ color: "var(--text2)" }}>
                        {exp.company}
                        {exp.start && (
                          <span> | {exp.start} — {exp.end || "настоящее время"}</span>
                        )}
                      </div>
                      {exp.description && (
                        <div
                          style={{ marginTop: 4, color: "var(--text2)", lineHeight: 1.5 }}
                          dangerouslySetInnerHTML={{ __html: exp.description }}
                        />
                      )}
                    </div>
                  ))}

                  {r.education?.primary && r.education.primary.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, marginBottom: 8, marginTop: 12 }}>Образование:</div>
                      {r.education.primary.map((edu, i) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          <div style={{ fontWeight: 500 }}>{edu.organization}</div>
                          <div style={{ color: "var(--text2)" }}>
                            {edu.name} {edu.year && `(${edu.year})`}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => addToDatabase(r)}
                disabled={adding === r.id || added.has(r.id)}
              >
                {added.has(r.id) ? "Добавлено" : adding === r.id ? "..." : "Добавить в базу"}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--surface2)", color: "var(--text2)" }}
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                {expandedId === r.id ? "Скрыть" : "Подробнее"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button
            className="btn btn-sm"
            style={{ background: "var(--surface2)", color: "var(--text)" }}
            disabled={page === 0 || loading}
            onClick={() => handleSearch(page - 1)}
          >
            Назад
          </button>
          <span style={{ padding: "6px 12px", fontSize: 13, color: "var(--text2)" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm"
            style={{ background: "var(--surface2)", color: "var(--text)" }}
            disabled={page >= totalPages - 1 || loading}
            onClick={() => handleSearch(page + 1)}
          >
            Вперёд
          </button>
        </div>
      )}

      {/* Пустое состояние */}
      {!loading && resumes.length === 0 && totalFound === 0 && !error && (
        <div className="empty">
          <h3>Поиск резюме на HH.kz</h3>
          <p>Ищите кандидатов напрямую на HeadHunter Казахстан</p>
          <div style={{ marginTop: 16, textAlign: "left", display: "inline-block", fontSize: 14, color: "var(--text2)", lineHeight: 1.8 }}>
            <p>— Введите должность или навыки в строку поиска</p>
            <p>— Просматривайте резюме с опытом, навыками и образованием</p>
            <p>— Нажмите <strong>«Добавить в базу»</strong> чтобы сохранить кандидата</p>
            <p>— Затем используйте <strong>«Подбор»</strong> для сравнения с вакансиями</p>
          </div>
          {!token && (
            <div style={{ marginTop: 20 }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowTokenInput(true)}
              >
                Настроить API-токен HH.kz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
