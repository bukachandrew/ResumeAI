"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { parseResumeText } from "../../lib/matching";
import { getZodiacSign, getNumerologyNumber } from "../../lib/zodiac";

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

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rawText, setRawText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [expYears, setExpYears] = useState(0);
  const [education, setEducation] = useState("");
  const [parsedPosition, setParsedPosition] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(0);
  const [birthDate, setBirthDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropFileRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    const { data } = await supabase
      .from("resumes")
      .select("*")
      .order("created_at", { ascending: false });
    setResumes(data || []);
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setRawText("");
    setSkills([]);
    setCustomSkill("");
    setExpYears(0);
    setEducation("");
    setParsedPosition("");
    setCountry("");
    setCity("");
    setSalaryMin(0);
    setSalaryMax(0);
    setBirthDate("");
    setPhotoUrl("");
    setEditingId(null);
    setShowForm(false);
  }

  function handleTextChange(text: string) {
    setRawText(text);
    const parsed = parseResumeText(text);
    setSkills(parsed.skills);
    if (parsed.experience_years > 0) setExpYears(parsed.experience_years);
    if (parsed.education) setEducation(parsed.education);
  }

  async function processPDF(file: File) {
    setUploading(true);
    try {
      const { extractTextFromPDF, parseHHResume } = await import("../../lib/pdf-parser");
      const text = await extractTextFromPDF(file);
      const parsed = parseHHResume(text);

      setRawText(parsed.raw_text);
      if (parsed.candidate_name) setName(parsed.candidate_name);
      else if (!name) setName(file.name.replace(/\.pdf$/i, ""));
      if (parsed.email) setEmail(parsed.email);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.skills.length > 0) setSkills(parsed.skills);
      if (parsed.experience_years > 0) setExpYears(parsed.experience_years);
      if (parsed.education) setEducation(parsed.education);
      if (parsed.position) setParsedPosition(parsed.position);

      setShowForm(true);
    } catch (err) {
      alert("Ошибка при чтении PDF: " + (err as Error).message);
    }
    setUploading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".pdf")) {
      await processPDF(file);
    } else {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        handleTextChange(text);
        if (!name) setName(file.name.replace(/\.\w+$/, ""));
        setShowForm(true);
        setUploading(false);
      };
      reader.readAsText(file);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".pdf")) {
      await processPDF(file);
    } else {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        handleTextChange(text);
        if (!name) setName(file.name.replace(/\.\w+$/, ""));
        setShowForm(true);
        setUploading(false);
      };
      reader.readAsText(file);
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function startEdit(resume: Resume) {
    setEditingId(resume.id);
    setName(resume.candidate_name);
    setEmail(resume.email || "");
    setPhone(resume.phone || "");
    setRawText(resume.raw_text);
    setSkills(resume.skills || []);
    setExpYears(resume.experience_years);
    setEducation(resume.education || "");
    setParsedPosition("");
    setCountry(resume.country || "");
    setCity(resume.city || "");
    setSalaryMin(resume.salary_min || 0);
    setSalaryMax(resume.salary_max || 0);
    setBirthDate(resume.birth_date || "");
    setPhotoUrl(resume.photo_url || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addCustomSkill() {
    const s = customSkill.trim().toLowerCase();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setCustomSkill("");
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !rawText) return;
    setLoading(true);

    const data = {
      candidate_name: name,
      email,
      phone,
      skills,
      experience_years: expYears,
      education,
      raw_text: rawText,
      country,
      city,
      salary_min: salaryMin,
      salary_max: salaryMax,
      birth_date: birthDate || null,
      photo_url: photoUrl,
    };

    if (editingId) {
      await supabase.from("resumes").update(data).eq("id", editingId);
    } else {
      await supabase.from("resumes").insert(data);
    }

    resetForm();
    setLoading(false);
    loadResumes();
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить это резюме?")) return;
    await supabase.from("resumes").delete().eq("id", id);
    loadResumes();
  }

  function formatBirthInfo(dateStr: string) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const zodiac = getZodiacSign(date);
    const numNumber = getNumerologyNumber(date);
    const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return { date, age, zodiac, numNumber };
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>База резюме</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Загрузка..." : "Загрузить PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            className="btn"
            style={{ background: "var(--surface2)", color: "var(--text)" }}
            onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          >
            {showForm ? "Отмена" : "+ Вручную"}
          </button>
        </div>
      </div>

      {/* Drag & Drop зона */}
      {!showForm && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => dropFileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            padding: "48px 24px",
            textAlign: "center",
            marginBottom: 24,
            cursor: "pointer",
            background: dragOver ? "rgba(59,130,246,0.05)" : "transparent",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={dropFileRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>PDF</div>
          <div style={{ fontSize: 16, marginBottom: 6 }}>
            {uploading ? "Обработка файла..." : "Перетащите PDF-резюме сюда или нажмите для выбора"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>
            Поддерживаются резюме с HH.ru и других площадок. Данные заполнятся автоматически.
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3>{editingId ? "Редактирование резюме" : "Новое резюме"}</h3>
            {parsedPosition && (
              <span className="tag tag-blue" style={{ fontSize: 13 }}>
                {parsedPosition}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Загрузка PDF внутри формы */}
            <div
              style={{
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius)",
                padding: "16px",
                textAlign: "center",
                marginBottom: 20,
                cursor: "pointer",
                background: "var(--surface2)",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 14, color: "var(--text2)" }}>
                {uploading ? "Обработка PDF..." : "Нажмите чтобы загрузить PDF (HH.ru или другой формат)"}
              </div>
            </div>

            {/* Фото профиля */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: photoUrl ? "transparent" : "var(--surface2)",
                  border: `2px dashed ${photoUrl ? "var(--accent)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text2)", textAlign: "center" }}>Фото</span>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />
              <div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>Фото профиля</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: "var(--surface2)", color: "var(--text2)" }}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    Загрузить фото
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: "var(--surface2)", color: "var(--red)" }}
                      onClick={() => setPhotoUrl("")}
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <div className="form-group" style={{ marginTop: 8, marginBottom: 0 }}>
                  <input
                    type="text"
                    value={photoUrl.startsWith("data:") ? "" : photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="Или вставьте URL фото..."
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>ФИО кандидата *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иванов Иван Иванович" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivan@example.com" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Телефон</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 999 123 4567" />
              </div>
              <div className="form-group">
                <label>Дата рождения</label>
                <div className="date-input-wrapper">
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  {birthDate && formatBirthInfo(birthDate) && (() => {
                    const info = formatBirthInfo(birthDate)!;
                    return (
                      <div className="date-preview">
                        <span className="date-preview-emoji">{info.zodiac.emoji}</span>
                        <div className="date-preview-text">
                          <span>{info.zodiac.sign}</span> &middot; {info.age} лет &middot; Число судьбы: <span>{info.numNumber}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Страна</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Казахстан" />
              </div>
              <div className="form-group">
                <label>Город</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Алматы" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Зарплата от (тг)</label>
                <input type="number" value={salaryMin || ""} onChange={(e) => setSalaryMin(+e.target.value)} placeholder="300000" min={0} />
              </div>
              <div className="form-group">
                <label>Зарплата до (тг)</label>
                <input type="number" value={salaryMax || ""} onChange={(e) => setSalaryMax(+e.target.value)} placeholder="500000" min={0} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Опыт работы (лет)</label>
                <input type="number" value={expYears} onChange={(e) => setExpYears(+e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label>Образование</label>
                <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Высшее, Бакалавр ИТ" />
              </div>
            </div>

            <div className="form-group">
              <label>Навыки</label>
              {skills.length > 0 && (
                <div className="tags" style={{ marginBottom: 8 }}>
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="tag tag-blue"
                      style={{ cursor: "pointer" }}
                      onClick={() => removeSkill(s)}
                      title="Нажмите чтобы удалить"
                    >
                      {s} ×
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                  placeholder="Добавить навык вручную..."
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={addCustomSkill}>
                  Добавить
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Текст резюме * (заполняется автоматически из PDF)</label>
              <textarea
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Вставьте текст резюме сюда или загрузите PDF файл..."
                style={{ minHeight: 160 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={loading || !name || !rawText}>
                {loading ? "Сохранение..." : editingId ? "Сохранить изменения" : "Добавить резюме"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-danger" onClick={resetForm}>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {resumes.length === 0 && !showForm ? (
        <div className="empty">
          <h3>Нет резюме</h3>
          <p>Загрузите PDF-резюме с HH.ru или добавьте вручную.</p>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 12 }}>
            Всего: {resumes.length} резюме
          </p>
          {resumes.map((r) => {
            const birthInfo = formatBirthInfo(r.birth_date);
            return (
              <div key={r.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ display: "flex", gap: 16, flex: 1 }}>
                    {/* Photo */}
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "var(--surface2)",
                      flexShrink: 0,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {r.photo_url ? (
                        <img src={r.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 20, color: "var(--text2)" }}>
                          {r.candidate_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h3>{r.candidate_name}</h3>
                      <div style={{ color: "var(--text2)", fontSize: 13, marginBottom: 8 }}>
                        {r.email && <span>{r.email} </span>}
                        {r.phone && <span>| {r.phone} </span>}
                        {r.experience_years > 0 && <span>| {r.experience_years} лет опыта </span>}
                        {r.education && <span>| {r.education}</span>}
                      </div>
                      {(r.country || r.city) && (
                        <div style={{ color: "var(--text2)", fontSize: 12, marginBottom: 6 }}>
                          {r.country}{r.city ? `, ${r.city}` : ""}
                          {(r.salary_min > 0 || r.salary_max > 0) && (
                            <span>
                              {" "}| ЗП: {r.salary_min > 0 ? r.salary_min.toLocaleString() : "..."}
                              {" - "}
                              {r.salary_max > 0 ? `${r.salary_max.toLocaleString()} тг` : "..."}
                            </span>
                          )}
                        </div>
                      )}
                      {birthInfo && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                          <span className="birth-badge">
                            {birthInfo.zodiac.emoji} {birthInfo.zodiac.sign}
                          </span>
                          <span className="birth-badge">
                            {birthInfo.age} лет
                          </span>
                          <span className="birth-badge">
                            Число судьбы: {birthInfo.numNumber}
                          </span>
                        </div>
                      )}
                      <div className="tags">
                        {(r.skills || []).map((s) => (
                          <span key={s} className="tag tag-blue">{s}</span>
                        ))}
                      </div>
                      {expandedId === r.id && (
                        <div style={{
                          marginTop: 12,
                          padding: 12,
                          background: "var(--surface2)",
                          borderRadius: "var(--radius)",
                          fontSize: 13,
                          whiteSpace: "pre-wrap",
                          maxHeight: 300,
                          overflow: "auto",
                          color: "var(--text2)",
                        }}>
                          {r.raw_text}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <button
                      className="btn btn-sm"
                      style={{ background: "var(--surface2)", color: "var(--text2)" }}
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      {expandedId === r.id ? "Скрыть" : "Текст"}
                    </button>
                    <button className="btn btn-sm" style={{ background: "var(--surface2)", color: "var(--accent)" }} onClick={() => startEdit(r)}>
                      Изменить
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
