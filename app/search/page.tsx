"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { calculateMatch, parseResumeText, type Resume, type Requirement, type MatchResult } from "../../lib/matching";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minExp, setMinExp] = useState(0);
  const [results, setResults] = useState<(MatchResult & { candidate_name: string; email: string; phone: string; skills: string[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() && !skillsInput.trim()) return;
    setLoading(true);

    // Загружаем все резюме
    const { data: resumes } = await supabase.from("resumes").select("*");
    if (!resumes || resumes.length === 0) {
      setResults([]);
      setLoading(false);
      setHasSearched(true);
      return;
    }

    // Формируем виртуальное требование из поискового запроса
    const searchSkills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Извлекаем навыки из названия вакансии
    const parsed = parseResumeText(query);
    const allSkills = Array.from(new Set(searchSkills.concat(parsed.skills)));

    const virtualReq: Requirement = {
      id: 0,
      title: query,
      required_skills: allSkills,
      min_experience_years: minExp,
      education: "",
      description: query,
    };

    // Считаем match для каждого резюме
    const matchResults = resumes.map((resume: Resume) => {
      const result = calculateMatch(resume, virtualReq);

      // Дополнительный бонус за совпадение текста запроса в резюме
      const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const rawLower = resume.raw_text.toLowerCase();
      let textBonus = 0;
      if (queryWords.length > 0) {
        const foundWords = queryWords.filter((w) => rawLower.includes(w)).length;
        textBonus = (foundWords / queryWords.length) * 15;
      }

      const finalScore = Math.min(100, Math.round((result.score + textBonus) * 100) / 100);

      return {
        ...result,
        score: finalScore,
        candidate_name: resume.candidate_name,
        email: resume.email || "",
        phone: resume.phone || "",
        skills: resume.skills || [],
      };
    });

    // Сортируем и фильтруем (показываем только > 5%)
    matchResults.sort((a, b) => b.score - a.score);
    setResults(matchResults.filter((r) => r.score > 5));
    setLoading(false);
    setHasSearched(true);
  }

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

  return (
    <div className="container">
      <div className="page-header">
        <h1>Поиск кандидатов</h1>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSearch}>
          <div className="form-group">
            <label>Название вакансии или ключевые слова</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: Frontend разработчик React, Backend Python Developer..."
              style={{ fontSize: 16, padding: 14 }}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Требуемые навыки (через запятую, необязательно)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="React, TypeScript, Node.js"
              />
            </div>
            <div className="form-group">
              <label>Минимальный опыт (лет)</label>
              <input type="number" value={minExp} onChange={(e) => setMinExp(+e.target.value)} min={0} />
            </div>
          </div>

          {skillsInput && (
            <div className="tags" style={{ marginBottom: 12 }}>
              {skillsInput.split(",").map((s) => s.trim()).filter(Boolean).map((s, i) => (
                <span key={i} className="tag tag-yellow">{s}</span>
              ))}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading || (!query.trim() && !skillsInput.trim())}>
            {loading ? "Поиск..." : "Найти кандидатов"}
          </button>
        </form>
      </div>

      {hasSearched && (
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 12 }}>
          {results.length > 0
            ? `Найдено: ${results.length} кандидатов | Подходящих (70%+): ${results.filter((r) => r.score >= 70).length}`
            : "Подходящих кандидатов не найдено"}
        </p>
      )}

      {results.map((r, i) => (
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
                <h3 style={{ margin: 0 }}>{r.candidate_name}</h3>
              </div>

              {(r.email || r.phone) && (
                <div style={{ color: "var(--text2)", fontSize: 12, marginBottom: 8 }}>
                  {r.email && <span>{r.email} </span>}
                  {r.phone && <span>| {r.phone}</span>}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div className="score-bar" style={{ height: 10 }}>
                  <div
                    className={`score-fill ${scoreColor(r.score)}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
              </div>

              <div className="tags" style={{ marginBottom: 8 }}>
                {r.skills.map((s, si) => {
                  const isMatch = r.skill_matches.map((m) => m.toLowerCase()).includes(s.toLowerCase());
                  return (
                    <span key={si} className={`tag ${isMatch ? "tag-green" : "tag-gray"}`}>{s}</span>
                  );
                })}
              </div>

              {r.skill_gaps.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>Не хватает: </span>
                  <div className="tags" style={{ display: "inline-flex" }}>
                    {r.skill_gaps.map((s) => (
                      <span key={s} className="tag tag-red">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="match-details" style={{ marginTop: 12 }}>
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
