"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface Requirement {
  id: number;
  title: string;
  required_skills: string[];
  min_experience_years: number;
  education: string;
  description: string;
  created_at: string;
}

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minExp, setMinExp] = useState(0);
  const [education, setEducation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadRequirements();
  }, []);

  async function loadRequirements() {
    const { data } = await supabase
      .from("requirements")
      .select("*")
      .order("created_at", { ascending: false });
    setRequirements(data || []);
  }

  function resetForm() {
    setTitle("");
    setSkillsInput("");
    setMinExp(0);
    setEducation("");
    setDescription("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(req: Requirement) {
    setEditingId(req.id);
    setTitle(req.title);
    setSkillsInput((req.required_skills || []).join(", "));
    setMinExp(req.min_experience_years);
    setEducation(req.education || "");
    setDescription(req.description || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setLoading(true);

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const data = {
      title,
      required_skills: skills,
      min_experience_years: minExp,
      education,
      description,
    };

    if (editingId) {
      await supabase.from("requirements").update(data).eq("id", editingId);
    } else {
      await supabase.from("requirements").insert(data);
    }

    resetForm();
    setLoading(false);
    loadRequirements();
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить эту вакансию?")) return;
    await supabase.from("requirements").delete().eq("id", id);
    loadRequirements();
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Вакансии</h1>
        <button className="btn btn-primary" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
          {showForm ? "Отмена" : "+ Новая вакансия"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{editingId ? "Редактирование вакансии" : "Новая вакансия"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Название вакансии *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Developer" />
            </div>

            <div className="form-group">
              <label>Требуемые навыки (через запятую)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="React, TypeScript, Node.js, PostgreSQL"
              />
              {skillsInput && (
                <div className="tags" style={{ marginTop: 8 }}>
                  {skillsInput.split(",").map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} className="tag tag-yellow">{s}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Минимальный опыт (лет)</label>
                <input type="number" value={minExp} onChange={(e) => setMinExp(+e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label>Образование</label>
                <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Высшее, Бакалавр" />
              </div>
            </div>

            <div className="form-group">
              <label>Описание (дополнительные ключевые слова улучшают подбор)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите обязанности, стек технологий, условия..."
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={loading || !title}>
                {loading ? "Сохранение..." : editingId ? "Сохранить изменения" : "Создать вакансию"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-danger" onClick={resetForm}>Отмена</button>
              )}
            </div>
          </form>
        </div>
      )}

      {requirements.length === 0 ? (
        <div className="empty">
          <h3>Нет вакансий</h3>
          <p>Создайте первую вакансию чтобы начать подбор кандидатов.</p>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 12 }}>
            Всего: {requirements.length} вакансий
          </p>
          {requirements.map((r) => (
            <div key={r.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <h3>{r.title}</h3>
                  <div style={{ color: "var(--text2)", fontSize: 13, marginBottom: 8 }}>
                    {r.min_experience_years > 0 && <span>от {r.min_experience_years} лет опыта </span>}
                    {r.education && <span>| {r.education}</span>}
                  </div>
                  <div className="tags">
                    {(r.required_skills || []).map((s, i) => (
                      <span key={i} className="tag tag-yellow">{s}</span>
                    ))}
                  </div>
                  {r.description && (
                    <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 8 }}>
                      {r.description.length > 200 ? r.description.slice(0, 200) + "..." : r.description}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  <button className="btn btn-sm" style={{ background: "var(--surface2)", color: "var(--accent)" }} onClick={() => startEdit(r)}>
                    Изменить
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
