"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getZodiacSign, getNumerologyNumber } from "../../../lib/zodiac";

interface Resume {
  id: number;
  candidate_name: string;
  email: string;
  phone: string;
  skills: string[];
  experience_years: number;
  education: string;
  raw_text: string;
  created_at: string;
  country: string;
  city: string;
  salary_min: number;
  salary_max: number;
  birth_date: string;
  photo_url: string;
}

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", params.id)
        .single();
      setResume(data);
      setLoading(false);
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container">
        <p style={{ color: "var(--text2)" }}>Загрузка...</p>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="container">
        <div className="empty">
          <h3>Резюме не найдено</h3>
          <p>
            <a href="/resumes">Вернуться к списку резюме</a>
          </p>
        </div>
      </div>
    );
  }

  const birthInfo = resume.birth_date ? (() => {
    const date = new Date(resume.birth_date);
    if (isNaN(date.getTime())) return null;
    const zodiac = getZodiacSign(date);
    const numNumber = getNumerologyNumber(date);
    const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return { date, age, zodiac, numNumber };
  })() : null;

  return (
    <div className="container">
      <div className="page-header">
        <h1>{resume.candidate_name}</h1>
        <button
          className="btn"
          style={{ background: "var(--surface2)", color: "var(--text)" }}
          onClick={() => router.back()}
        >
          Назад
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          {/* Photo */}
          <div style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "var(--surface2)",
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {resume.photo_url ? (
              <img src={resume.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 36, color: "var(--text2)" }}>
                {resume.candidate_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            {resume.email && (
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>
                Email: <span style={{ color: "var(--text)" }}>{resume.email}</span>
              </div>
            )}
            {resume.phone && (
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>
                Телефон: <span style={{ color: "var(--text)" }}>{resume.phone}</span>
              </div>
            )}
            {(resume.country || resume.city) && (
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>
                Локация: <span style={{ color: "var(--text)" }}>
                  {resume.country}{resume.city ? `, ${resume.city}` : ""}
                </span>
              </div>
            )}
            {resume.experience_years > 0 && (
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>
                Опыт: <span style={{ color: "var(--text)" }}>{resume.experience_years} лет</span>
              </div>
            )}
            {resume.education && (
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>
                Образование: <span style={{ color: "var(--text)" }}>{resume.education}</span>
              </div>
            )}
            {(resume.salary_min > 0 || resume.salary_max > 0) && (
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>
                Зарплата: <span style={{ color: "var(--text)" }}>
                  {resume.salary_min > 0 ? resume.salary_min.toLocaleString() : "..."}
                  {" - "}
                  {resume.salary_max > 0 ? `${resume.salary_max.toLocaleString()} тг` : "..."}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Zodiac & Numerology */}
        {birthInfo && (
          <div className="birth-card birth-card-lg" style={{ marginBottom: 20 }}>
            <div className="birth-emoji birth-emoji-lg">{birthInfo.zodiac.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                {birthInfo.zodiac.sign}
              </div>
              <div className="birth-info-grid">
                <div className="birth-info-item">
                  <span className="label">Дата рождения</span>
                  <span className="value">{birthInfo.date.toLocaleDateString("ru-RU")}</span>
                </div>
                <div className="birth-info-item">
                  <span className="label">Возраст</span>
                  <span className="value">{birthInfo.age} лет</span>
                </div>
                <div className="birth-info-item">
                  <span className="label">Число судьбы</span>
                  <span className="value" style={{ color: "#a5b4fc" }}>{birthInfo.numNumber}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {resume.skills && resume.skills.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>Навыки</div>
            <div className="tags">
              {resume.skills.map((s) => (
                <span key={s} className="tag tag-blue">{s}</span>
              ))}
            </div>
          </div>
        )}

        {resume.raw_text && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>Текст резюме</div>
            <div
              style={{
                padding: 16,
                background: "var(--surface2)",
                borderRadius: "var(--radius)",
                fontSize: 13,
                whiteSpace: "pre-wrap",
                maxHeight: 500,
                overflow: "auto",
                color: "var(--text2)",
                lineHeight: 1.6,
              }}
            >
              {resume.raw_text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
