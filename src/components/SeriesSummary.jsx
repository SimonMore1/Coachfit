// src/components/SeriesSummary.jsx
import React, { useMemo } from "react";

/**
 * Component: SeriesSummary
 * - Accetta indifferentemente: { plan } oppure { template } oppure { currentTemplate }
 * - È null-safe: se i dati non ci sono, mostra un pannello vuoto.
 * - Calcola: serie totali per gruppo muscolare + totale generale.
 */
export default function SeriesSummary(props) {
  // accetta varianti di nome per compatibilità
  const plan =
    props.plan || props.template || props.currentTemplate || null;

  const { perGroup, total } = useMemo(() => {
    const map = new Map();
    let t = 0;

    if (
      plan &&
      Array.isArray(plan.days)
    ) {
      for (const day of plan.days ?? []) {
        for (const row of day?.entries ?? []) {
          const g = row?.muscleGroup || row?.muscle || "Altro";
          const sets =
            Number(row?.sets ?? row?.targetSets ?? 0) || 0;

          if (!map.has(g)) map.set(g, 0);
          map.set(g, map.get(g) + sets);
          t += sets;
        }
      }
    }

    // ordina alfabeticamente i gruppi
    const perGroup = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    return { perGroup, total: t };
  }, [plan]);

  return (
    <aside
      className="series-summary"
      aria-label="Riepilogo serie per gruppo"
      style={{
        position: "sticky",
        top: 16,
        alignSelf: "start",
        background: "white",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16 }}>📊 Serie per gruppo</h3>

      {(!perGroup || perGroup.length === 0) && (
        <p style={{ color: "#667085", marginTop: 12 }}>
          Aggiungi esercizi per vedere il riepilogo.
        </p>
      )}

      {perGroup.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0 0" }}>
          {perGroup.map(([group, n]) => (
            <li
              key={group}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px dashed rgba(0,0,0,0.06)",
              }}
            >
              <span style={{ color: "#475467" }}>{group}</span>
              <strong style={{ color: "#111827" }}>{n}</strong>
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          paddingTop: 8,
          borderTop: "1px solid rgba(0,0,0,0.1)",
          fontWeight: 600,
        }}
      >
        <span>Totale serie</span>
        <span>{total}</span>
      </div>
    </aside>
  );
}