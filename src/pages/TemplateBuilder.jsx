// src/pages/TemplateBuilder.jsx
import React, { useMemo, useState } from "react";
import SeriesSummary from "../components/SeriesSummary.jsx";

/** ========== UTIL ========== */

// enumerazione sicura (evita `.entries is not iterable`)
function* enumerate(arr = []) {
  if (!Array.isArray(arr)) return;
  for (let i = 0; i < arr.length; i++) yield [i, arr[i]];
}

// piccolo catalogo di esempio (se nel tuo progetto esiste già, puoi ignorarlo)
const CATALOG = [
  { id: "panca-piana", name: "Panca Piana", muscleGroup: "Petto" },
  { id: "dip", name: "Dip alle Parallele", muscleGroup: "Tricipiti" },
  { id: "lat", name: "Lat Machine", muscleGroup: "Schiena" },
  { id: "squat", name: "Squat", muscleGroup: "Gambe" },
];

/** ========== BUILDER PAGE ========== */

export default function TemplateBuilder() {
  // stato della scheda (plan)
  const [plan, setPlan] = useState(() => ({
    id: null,
    name: "",
    days: [
      // giorno 1 iniziale
      { label: "Giorno 1", entries: [] },
    ],
  }));

  // selezione giorno corrente
  const [dayIndex, setDayIndex] = useState(0);

  // filtri & ricerca per l’elenco esercizi
  const [query, setQuery] = useState("");
  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter((e) =>
      e.name.toLowerCase().includes(q)
    );
  }, [query]);

  const currentDay = plan.days?.[dayIndex];

  /** ===== Handlers di base ===== */

  const addDay = () => {
    setPlan((p) => ({
      ...p,
      days: [
        ...p.days,
        { label: `Giorno ${p.days.length + 1}`, entries: [] },
      ],
    }));
    setDayIndex(plan.days.length); // seleziona il nuovo giorno
  };

  const removeDay = () => {
    setPlan((p) => {
      if (p.days.length <= 1) return p;
      const copy = [...p.days];
      copy.splice(dayIndex, 1);
      return { ...p, days: copy };
    });
    setDayIndex((i) => Math.max(0, i - 1));
  };

  const addExerciseToDay = (ex) => {
    setPlan((p) => {
      const days = [...p.days];
      const d = { ...(days[dayIndex]) };
      const entries = [...(d.entries ?? [])];

      entries.push({
        id: `${ex.id}-${Date.now()}`,
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup || "Altro",
        sets: 3,
        reps: 10,
        weight_kg: null,
        notes: "",
      });

      d.entries = entries;
      days[dayIndex] = d;
      return { ...p, days };
    });
  };

  const removeExerciseFromDay = (entryId) => {
    setPlan((p) => {
      const days = [...p.days];
      const d = { ...(days[dayIndex]) };
      d.entries = (d.entries ?? []).filter((r) => r.id !== entryId);
      days[dayIndex] = d;
      return { ...p, days };
    });
  };

  const updateEntry = (entryId, patch) => {
    setPlan((p) => {
      const days = [...p.days];
      const d = { ...(days[dayIndex]) };
      d.entries = (d.entries ?? []).map((r) =>
        r.id === entryId ? { ...r, ...patch } : r
      );
      days[dayIndex] = d;
      return { ...p, days };
    });
  };

  /** ====== Stub per cloud (mantieni i tuoi esistenti) ====== */
  const saveToCloud = async () => {
    // qui puoi richiamare supabase per salvare `plan`
    // es.: await supabase.from('templates').upsert({ ... })
    console.log("SALVA su cloud", plan);
    alert("Mock: scheda salvata (vedi console).");
  };
  const duplicatePlan = () => {
    setPlan((p) => ({
      ...p,
      id: null,
      name: `${p.name || "Scheda"} (copia)`,
    }));
  };
  const deletePlan = () => {
    if (!confirm("Eliminare questa scheda?")) return;
    setPlan({ id: null, name: "", days: [{ label: "Giorno 1", entries: [] }] });
    setDayIndex(0);
  };

  /** ====== JSX ====== */

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Builder schede</h1>

      {/* Header scheda */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 200px 200px auto",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <input
          value={plan.name}
          onChange={(e) =>
            setPlan((p) => ({ ...p, name: e.target.value }))
          }
          placeholder="Nome scheda…"
          style={{
            padding: "12px 14px",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            fontSize: 16,
          }}
        />

        <select
          value={dayIndex}
          onChange={(e) => setDayIndex(Number(e.target.value))}
          style={{
            padding: "10px 12px",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
          }}
        >
          {Array.isArray(plan.days) &&
            plan.days.map((d, i) => (
              <option key={i} value={i}>
                {d.label || `Giorno ${i + 1}`}
              </option>
            ))}
        </select>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={addDay}>+ Giorno</button>
          <button onClick={removeDay} disabled={(plan.days?.length ?? 1) <= 1}>
            −
          </button>
        </div>

        <div style={{ justifySelf: "end", display: "flex", gap: 8 }}>
          <button onClick={duplicatePlan}>Duplica</button>
          <button onClick={deletePlan}>Elimina</button>
          <button
            onClick={saveToCloud}
            style={{
              background:
                "linear-gradient(135deg,#7066ff 0%, #6aa8ff 100%)",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: 10,
            }}
          >
            💾 Salva su cloud
          </button>
        </div>
      </div>

      {/* Layout 2 colonne */}
      <div
        className="tpl-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ====== COLONNA SINISTRA: BUILDER ====== */}
        <div>
          {/* Barra filtri/ricerca */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 220px",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca esercizio…"
              style={{
                padding: "10px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
              }}
            />
            <select
              onChange={(e) => {
                const ex = filteredCatalog.find(
                  (x) => x.id === e.target.value
                );
                if (ex) addExerciseToDay(ex);
                // reset selezione per poter ri-selezionare lo stesso
                e.target.value = "";
              }}
              defaultValue=""
              style={{
                padding: "10px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
              }}
            >
              <option value="" disabled>
                Elenco esercizi
              </option>
              {filteredCatalog.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lista esercizi del giorno */}
          <section
            style={{
              background: "white",
              border: "1px solid #EEF2F7",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 14, color: "#475467" }}>
              Esercizi — {currentDay?.label || `Giorno ${dayIndex + 1}`}
            </h3>

            {(!currentDay?.entries || currentDay.entries.length === 0) && (
              <p style={{ color: "#667085" }}>
                Nessun esercizio in questo giorno.
              </p>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {Array.isArray(currentDay?.entries) &&
                currentDay.entries.map((row) => (
                  <article
                    key={row.id}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    {/* header / nome esercizio */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          background: "#EEF2FF",
                          color: "#3730A3",
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 13,
                        }}
                      >
                        {row.exerciseName}
                      </span>

                      <button
                        onClick={() => removeExerciseFromDay(row.id)}
                        style={{
                          marginLeft: "auto",
                          border: "1px solid #FEE2E2",
                          color: "#B91C1C",
                          background: "#FEF2F2",
                          borderRadius: 8,
                          padding: "6px 10px",
                        }}
                      >
                        🗑︎
                      </button>
                    </div>

                    {/* riga A: serie / ripetizioni */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 160px)",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          Serie
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={row.sets ?? 0}
                          onChange={(e) =>
                            updateEntry(row.id, {
                              sets: Number(e.target.value || 0),
                            })
                          }
                          style={inpStyle}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          Ripetizioni
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={row.reps ?? 0}
                          onChange={(e) =>
                            updateEntry(row.id, {
                              reps: Number(e.target.value || 0),
                            })
                          }
                          style={inpStyle}
                        />
                      </label>
                    </div>

                    {/* riga B: kg / note (opz) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 1fr",
                        gap: 12,
                      }}
                    >
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          Kg (opz.)
                        </span>
                        <input
                          type="number"
                          value={row.weight_kg ?? ""}
                          onChange={(e) =>
                            updateEntry(row.id, {
                              weight_kg:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                          style={inpStyle}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          Note (opz.)
                        </span>
                        <input
                          type="text"
                          value={row.notes ?? ""}
                          onChange={(e) =>
                            updateEntry(row.id, { notes: e.target.value })
                          }
                          placeholder="Aggiungi una nota"
                          style={inpStyle}
                        />
                      </label>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        </div>

        {/* ====== COLONNA DESTRA: RIEPILOGO ====== */}
        <SeriesSummary plan={plan} />
      </div>
    </div>
  );
}

/** stile input riutilizzabile */
const inpStyle = {
  padding: "10px 12px",
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  outline: "none",
};