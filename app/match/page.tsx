"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { calculateMatch, type Resume, type Requirement, type MatchResult } from "../../lib/matching";

type ResultItem = MatchResult & {
  candidate_name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  salary_min: number;
  salary_max: number;
  experience_years: number;
  photo_url: string;
};

export default function MatchPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // Filters
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSalaryMin, setFilterSalaryMin] = useState("");
  const [filterSalaryMax, setFilterSalaryMax] = useState("");
  const [filterExpMin, setFilterExpMin] = useState("");
  const [filterExpMax, setFilterExpMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      const [r1, r2] = await Promise.all([
        supabase.from("requirements").select("*").order("created_at", { ascending: false }),
        supabase.from("resumes").select("*").order("created_at", { ascending: false }),
      ]);
      setRequirements(r1.data || []);
      setResumes(r2.data || []);
    }
    load();
  }, []);

  // Unique countries and cities from resumes for filter dropdowns
  const countries = useMemo(() => {
    const set = new Set(resumes.map((r) => r.country || "").filter(Boolean));
    return Array.from(set).sort();
  }, [resumes]);

  const cities = useMemo(() => {
    const filtered = filterCountry
      ? resumes.filter((r) => r.country === filterCountry)
      : resumes;
    const set = new Set(filtered.map((r) => r.city || "").filter(Boolean));
    return Array.from(set).sort();
  }, [resumes, filterCountry]);

  async function runMatching() {
    if (!selectedReqId) return;
    setLoading(true);

    const req = requirements.find((r) => r.id === selectedReqId);
    if (!req) return;

    const matchResults: ResultItem[] = resumes.map((resume) => {
      const result = calculateMatch(resume, req);
      return {
        ...result,
        candidate_name: resume.candidate_name,
        email: resume.email || "",
        phone: resume.phone || "",
        country: resume.country || "",
        city: resume.city || "",
        salary_min: resume.salary_min || 0,
        salary_max: resume.salary_max || 0,
        experience_years: resume.experience_years || 0,
        photo_url: resume.photo_url || "",
      };
    });

    matchResults.sort((a, b) => b.score - a.score);
    setResults(matchResults);

    // Сохраняем результаты в БД
    await supabase.from("matches").delete().eq("requirement_id", selectedReqId);
    const inserts = matchResults.map((m) => ({
      resume_id: m.resume_id,
      requirement_id: m.requirement_id,
      score: m.score,
      skill_matches: m.skill_matches,
      skill_gaps: m.skill_gaps,
      details: m.details,
    }));
    if (inserts.length > 0) {
      await supabase.from("matches").insert(inserts);
    }

    setLoading(false);
    setHasRun(true);
  }

  // Apply filters to results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (filterCountry && r.country !== filterCountry) return false;
      if (filterCity && r.city !== filterCity) return false;
      if (filterSalaryMin && r.salary_max > 0 && r.salary_max < +filterSalaryMin) return false;
      if (filterSalaryMax && r.salary_min > 0 && r.salary_min > +filterSalaryMax) return false;
      if (filterExpMin && r.experience_years < +filterExpMin) return false;
      if (filterExpMax && r.experience_years > +filterExpMax) return false;
      return true;
    });
  }, [results, filterCountry, filterCity, filterSalaryMin, filterSalaryMax, filterExpMin, filterExpMax]);

  function resetFilters() {
    setFilterCountry("");
    setFilterCity("");
    setFilterSalaryMin("");
    setFilterSalaryMax("");
    setFilterExpMin("");
    setFilterExpMax("");
  }

  const hasActiveFilters = filterCountry || filterCity || filterSalaryMin || filterSalaryMax || filterExpMin || filterExpMax;

  function scoreColor(score: number): string {
    if (score >= 70) return "score-high";
    if (score >= 40) return "score-mid";
    return "score-low";
  }

  function scoreTextColor(score: number): string {
    if (score >= 70) return "var(--green)";
    if (score >= 40) return "var(--yellow)";
    return "var(--red)";
  }

  const selectedReq = requirements.find((r) => r.id === selectedReqId);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Подбор кандидатов</h1>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text2)" }}>
              Выберите вакансию
            </label>
            <select
              value={selectedReqId ?? ""}
              onChange={(e) => setSelectedReqId(e.target.value ? +e.target.value : null)}
            >
              <option value="">-- Выберите вакансию --</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={runMatching}
            disabled={!selectedReqId || resumes.length === 0 || loading}
          >
            {loading ? "Поиск..." : "Найти кандидатов"}
          </button>
        </div>

        {selectedReq && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--text2)" }}>
            <span>Требуемые навыки: </span>
            <span className="tags" style={{ display: "inline-flex" }}>
              {(selectedReq.required_skills || []).map((s, i) => (
                <span key={i} className="tag tag-yellow">{s}</span>
              ))}
            </span>
            {selectedReq.min_experience_years > 0 && (
              <span style={{ marginLeft: 8 }}>| от {selectedReq.min_experience_years} лет опыта</span>
            )}
          </div>
        )}

        {resumes.length === 0 && (
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 8 }}>
            Нет загруженных резюме. <a href="/resumes">Добавьте резюме.</a>
          </p>
        )}
        {requirements.length === 0 && (
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 8 }}>
            Нет вакансий. <a href="/requirements">Создайте вакансию.</a>
          </p>
        )}
      </div>

      {/* Filters */}
      {hasRun && results.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Фильтры</span>
              {hasActiveFilters && (
                <span className="tag tag-blue" style={{ fontSize: 11 }}>активны</span>
              )}
            </div>
            <span style={{ color: "var(--text2)", fontSize: 13 }}>
              {showFilters ? "Скрыть" : "Показать"}
            </span>
          </div>

          {showFilters && (
            <div style={{ marginTop: 16 }}>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Страна</label>
                  <select value={filterCountry} onChange={(e) => { setFilterCountry(e.target.value); setFilterCity(""); }}>
                    <option value="">Все страны</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Город</label>
                  <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                    <option value="">Все города</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Зарплата от (тг)</label>
                  <input
                    type="number"
                    value={filterSalaryMin}
                    onChange={(e) => setFilterSalaryMin(e.target.value)}
                    placeholder="Мин. зарплата"
                    min={0}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Зарплата до (тг)</label>
                  <input
                    type="number"
                    value={filterSalaryMax}
                    onChange={(e) => setFilterSalaryMax(e.target.value)}
                    placeholder="Макс. зарплата"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Опыт от (лет)</label>
                  <input
                    type="number"
                    value={filterExpMin}
                    onChange={(e) => setFilterExpMin(e.target.value)}
                    placeholder="Мин. опыт"
                    min={0}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Опыт до (лет)</label>
                  <input
                    type="number"
                    value={filterExpMax}
                    onChange={(e) => setFilterExpMax(e.target.value)}
                    placeholder="Макс. опыт"
                    min={0}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  className="btn btn-sm"
                  style={{ background: "var(--surface2)", color: "var(--text2)" }}
                  onClick={resetFilters}
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {hasRun && results.length > 0 && (
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 12 }}>
          Найдено: {filteredResults.length} кандидатов
          {hasActiveFilters && ` (из ${results.length})`}
          {" "}| Подходящих (70%+): {filteredResults.filter((r) => r.score >= 70).length}
        </p>
      )}

      {hasRun && results.length === 0 && (
        <div className="empty">
          <h3>Нет результатов</h3>
          <p>Нет резюме для сравнения.</p>
        </div>
      )}

      {hasRun && results.length > 0 && filteredResults.length === 0 && (
        <div className="empty">
          <h3>Нет совпадений по фильтрам</h3>
          <p>Попробуйте изменить параметры фильтрации.</p>
        </div>
      )}

      {filteredResults.map((r, i) => (
        <div key={r.resume_id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: i < 3 ? "var(--accent)" : "var(--surface2)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: i < 3 ? "white" : "var(--text2)",
                }}>
                  #{i + 1}
                </span>
                {r.photo_url && (
                  <img
                    src={r.photo_url}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                  />
                )}
                <h3 style={{ margin: 0 }}>
                  <Link
                    href={`/resumes/${r.resume_id}`}
                    style={{ color: "var(--text)", transition: "color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}
                  >
                    {r.candidate_name}
                  </Link>
                </h3>
              </div>

              <div style={{ color: "var(--text2)", fontSize: 12, marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {r.email && <span>{r.email} </span>}
                {r.phone && <span>| {r.phone} </span>}
                {r.country && <span>| {r.country}</span>}
                {r.city && <span>, {r.city} </span>}
                {r.experience_years > 0 && <span>| {r.experience_years} лет опыта </span>}
                {(r.salary_min > 0 || r.salary_max > 0) && (
                  <span>
                    | ЗП: {r.salary_min > 0 ? `${r.salary_min.toLocaleString()}` : "..."}
                    {" - "}
                    {r.salary_max > 0 ? `${r.salary_max.toLocaleString()} тг` : "..."}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="score-bar" style={{ height: 10 }}>
                  <div
                    className={`score-fill ${scoreColor(r.score)}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
              </div>

              <div className="match-details">
                <div className="match-detail">
                  <div className="label">Навыки</div>
                  <div className="value" style={{ color: scoreTextColor(r.details.skill_score) }}>
                    {r.details.skill_score}%
                  </div>
                </div>
                <div className="match-detail">
                  <div className="label">Опыт</div>
                  <div className="value" style={{ color: scoreTextColor(r.details.experience_score) }}>
                    {r.details.experience_score}%
                  </div>
                </div>
                <div className="match-detail">
                  <div className="label">Образование</div>
                  <div className="value" style={{ color: scoreTextColor(r.details.education_score) }}>
                    {r.details.education_score}%
                  </div>
                </div>
                <div className="match-detail">
                  <div className="label">Ключевые слова</div>
                  <div className="value" style={{ color: scoreTextColor(r.details.keyword_score) }}>
                    {r.details.keyword_score}%
                  </div>
                </div>
              </div>

              {r.skill_matches.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>Совпадения: </span>
                  <div className="tags" style={{ display: "inline-flex" }}>
                    {r.skill_matches.map((s) => (
                      <span key={s} className="tag tag-green">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {r.skill_gaps.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>Не хватает: </span>
                  <div className="tags" style={{ display: "inline-flex" }}>
                    {r.skill_gaps.map((s) => (
                      <span key={s} className="tag tag-red">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="match-score" style={{ color: scoreTextColor(r.score), marginLeft: 16 }}>
              {r.score}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
