import { useEffect, useMemo, useState } from "react";

/**
 * Componente unico per scegliere e attivare una scheda.
 *
 * props:
 * - templates:      array schede personali [{id,name,days,...}]
 * - assignedPlans:  array schede assegnate dal PT [{id,name,days,...}]
 * - activePlan:     id o oggetto della scheda attiva (facoltativo)
 * - onActivate({ id, source }): callback quando clicchi "Attiva"
 * - onClear():      callback per disattivare la scheda attiva
 */
export default function ActivatePlan({
  templates = [],
  assignedPlans = [],
  activePlan = null,
  onActivate,
  onClear,
}) {
  // preparo le opzioni raggruppate
  const options = useMemo(() => {
    const normalize = (arr, source) =>
      (arr || []).map((x) => ({
        id: String(x?.id ?? x?.planId ?? ""),
        name: capitalize(x?.name || "Senza nome"),
        source,
        raw: x,
      }));

    const pt = normalize(assignedPlans, "PT").sort(sortByName);
    const me = normalize(templates, "ME").sort(sortByName);
    return { pt, me, all: [...pt, ...me] };
  }, [templates, assignedPlans]);

  // ricordo l’ultima selezione
  const [selectedId, setSelectedId] = useState(
    () => localStorage.getItem("coachfit:lastSelection") || ""
  );
  useEffect(() => {
    if (selectedId) localStorage.setItem("coachfit:lastSelection", selectedId);
  }, [selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const [src, id] = selectedId.split(":");
    return options.all.find((o) => o.id === id && o.source === src) || null;
  }, [selectedId, options]);

  const active = useMemo(() => {
    if (!activePlan) return null;
    const actId =
      typeof activePlan === "string"
        ? activePlan
        : String(activePlan?.id ?? activePlan?.planId ?? "");
    if (!actId) return null;
    return options.all.find((o) => o.id === actId) || null;
  }, [activePlan, options]);

  function handleActivate() {
    if (!selected) return;
    onActivate?.({ id: selected.id, source: selected.source });
  }
  function handleClear() {
    onClear?.();
  }

  return (
    <div className="card">
      {/* Banner stato corrente */}
      <div className="mb-3">
        {active ? (
          <div className="pill bg-indigo-50" style={{ justifyContent: "space-between" }}>
            <span>
              <strong>Scheda attiva:</strong> {active.name}{" "}
              <small className="text-slate-500">
                ({active.source === "PT" ? "assegnata dal PT" : "tua"})
              </small>
            </span>
            <button className="btn btn-ghost" onClick={handleClear}>Disattiva</button>
          </div>
        ) : (
          <div className="pill">
            <span className="text-slate-600">Nessuna scheda attiva</span>
          </div>
        )}
      </div>

      {/* Selettore unico */}
      <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          className="input"
          style={{ minWidth: 280 }}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Scegli una scheda —</option>

          <optgroup label="Assegnate dal PT">
            {options.pt.length === 0 && <option disabled>(nessuna)</option>}
            {options.pt.map((o) => (
              <option key={`pt-${o.id}`} value={`PT:${o.id}`}>{o.name}</option>
            ))}
          </optgroup>

          <optgroup label="Le mie schede">
            {options.me.length === 0 && <option disabled>(nessuna)</option>}
            {options.me.map((o) => (
              <option key={`me-${o.id}`} value={`ME:${o.id}`}>{o.name}</option>
            ))}
          </optgroup>
        </select>

        <button
          className="btn btn-primary"
          onClick={handleActivate}
          disabled={!selected || (active && selected?.id === active?.id)}
        >
          Attiva
        </button>
      </div>

      {/* Anteprima rapida */}
      {selected && (
        <div className="mt-3" style={{ fontSize: 14 }}>
          <div className="text-slate-600">Anteprima</div>
          <div className="card" style={{ marginTop: 8 }}>
            <div><strong>{selected.name}</strong> {selected.source === "PT" ? "· assegnata dal PT" : "· tua scheda"}</div>
            <div className="text-slate-600" style={{ marginTop: 4 }}>
              Giorni: <strong>{countDays(selected.raw)}</strong> · Serie target:{" "}
              <strong>{sumTargetSets(selected.raw)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function sortByName(a, b) {
  return a.name.localeCompare(b.name);
}
function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function countDays(plan) {
  const days = plan?.days || plan?.giorni || [];
  return Array.isArray(days) ? days.length : 0;
}
function sumTargetSets(plan) {
  const days = plan?.days || plan?.giorni || [];
  let sum = 0;
  for (const d of days) {
    const exs = d?.exercises || d?.esercizi || [];
    for (const ex of exs) {
      sum += Number(ex?.sets ?? ex?.serie ?? ex?.setsTarget ?? 0) || 0;
    }
  }
  return sum;
}