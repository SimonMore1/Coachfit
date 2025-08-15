// ====== Costanti base ======
export const MUSCLE_GROUPS = [
  "Petto","Schiena","Gambe","Spalle","Bicipiti","Tricipiti","Core","Altro"
];

// Utenti/Pazienti demo (per far girare l'app senza backend)
export const DEMO_USERS = [
  { id:"pt-1", role:"PT",   name:"Coach Luca" },
  { id:"user-1", role:"USER", name:"Simone"   }
];

export const DEMO_PATIENTS = [
  { id:"user-1", name:"Simone" },
  { id:"p1",     name:"Marco"  },
  { id:"p2",     name:"Giulia" }
];

// ====== Utility comuni ======
export function capWords(s=""){
  return s
    .split(" ")
    .filter(Boolean)
    .map(w => (w[0]?.toUpperCase() || "") + (w.slice(1) || "").toLowerCase())
    .join(" ");
}

export function clone(x){ return JSON.parse(JSON.stringify(x)); }

export function todayISO(){
  const d = new Date();
  const z = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}

// ====== Catalogo esercizi esteso (nome capitalizzato di default) ======
export const EXERCISE_CATALOG = [
  // Petto
  { name:"Panca Piana",             muscle:"Petto",     equipment:"Bilanciere", modality:"Spinta" },
  { name:"Panca Inclinata Manubri", muscle:"Petto",     equipment:"Manubri",    modality:"Spinta" },
  { name:"Chest Press",             muscle:"Petto",     equipment:"Macchina",   modality:"Spinta" },
  { name:"Croci ai Cavi",           muscle:"Petto",     equipment:"Cavi",       modality:"Spinta" },

  // Schiena
  { name:"Lat Machine",             muscle:"Schiena",   equipment:"Macchina",   modality:"Trazione" },
  { name:"Rematore Manubrio",       muscle:"Schiena",   equipment:"Manubri",    modality:"Trazione" },
  { name:"Trazioni alla Sbarra",    muscle:"Schiena",   equipment:"Corpo libero", modality:"Trazione" },
  { name:"Pulldown ai Cavi",        muscle:"Schiena",   equipment:"Cavi",       modality:"Trazione" },

  // Gambe
  { name:"Squat",                   muscle:"Gambe",     equipment:"Bilanciere", modality:"Gambe" },
  { name:"Affondi Manubri",         muscle:"Gambe",     equipment:"Manubri",    modality:"Gambe" },
  { name:"Leg Press",               muscle:"Gambe",     equipment:"Macchina",   modality:"Gambe" },
  { name:"Stacchi Rumeni",          muscle:"Gambe",     equipment:"Bilanciere", modality:"Gambe" },
  { name:"Polpacci in Piedi",       muscle:"Gambe",     equipment:"Macchina",   modality:"Gambe" },

  // Spalle
  { name:"Lento Avanti Bilanciere", muscle:"Spalle",    equipment:"Bilanciere", modality:"Spalle" },
  { name:"Arnold Press",            muscle:"Spalle",    equipment:"Manubri",    modality:"Spalle" },
  { name:"Alzate Laterali",         muscle:"Spalle",    equipment:"Manubri",    modality:"Spalle" },

  // Braccia
  { name:"Curl Manubri",            muscle:"Bicipiti",  equipment:"Manubri",    modality:"Braccia" },
  { name:"Curl Bilanciere",         muscle:"Bicipiti",  equipment:"Bilanciere", modality:"Braccia" },
  { name:"Pushdown ai Cavi",        muscle:"Tricipiti", equipment:"Cavi",       modality:"Braccia" },
  { name:"French Press",            muscle:"Tricipiti", equipment:"Bilanciere", modality:"Braccia" },

  // Core
  { name:"Plank",                   muscle:"Core",      equipment:"Corpo libero", modality:"Core" },
  { name:"Crunch su Panca",         muscle:"Core",      equipment:"Panca",      modality:"Core" },
];

// Derivati per UI / filtri
export const EXERCISE_NAMES = EXERCISE_CATALOG.map(e => e.name);
export const EQUIPMENTS     = [...new Set(EXERCISE_CATALOG.map(e => e.equipment))].sort();
export const MODALITIES     = [...new Set(EXERCISE_CATALOG.map(e => e.modality))].sort();

// ====== Heuristics per gruppo muscolare dal nome esercizio ======
export function detectGroup(name){
  const n = (name||"").toLowerCase();

  const rules = [
    [/panca|chest|petto/,                         "Petto"],
    [/lat machine|rematore|pull.?down|trazioni|row|pullover|schiena/, "Schiena"],
    [/squat|affondi|pressa|stacchi|leg|quad|hamstring|calf|polpacci|glute/, "Gambe"],
    [/spalle|shoulder|lateral|military|arnold|overhead/,              "Spalle"],
    [/bicipit|curl|hammer/,                                          "Bicipiti"],
    [/tricipit|french|pushdown|dips/,                                "Tricipiti"],
    [/addom|core|crunch|plank|obliqu/,                               "Core"],
  ];
  for (const [re, g] of rules) if (re.test(n)) return g;

  // fallback: dal catalogo
  const found = EXERCISE_CATALOG.find(e => e.name.toLowerCase() === n);
  return found?.muscle ?? "Altro";
}