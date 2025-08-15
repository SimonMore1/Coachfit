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

// --- helper per creare un id semplice dai nomi (panca-piana, ecc.)
function slug(s=""){
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // rimuove accenti
    .replace(/[^a-z0-9]+/g,"-")                     // tutto il resto -> trattino
    .replace(/(^-|-$)/g,"");                        // toglie trattini agli estremi
}

// ====== Catalogo esercizi esteso ======
// Campi: id, name, muscle, equipment, modality
export const EXERCISE_CATALOG = [
  // Petto (modality: Spinta)
  { id: slug("Panca Piana"),              name:"Panca Piana",              muscle:"Petto",     equipment:"Bilanciere", modality:"Spinta" },
  { id: slug("Panca Inclinata Manubri"),  name:"Panca Inclinata Manubri",  muscle:"Petto",     equipment:"Manubri",    modality:"Spinta" },
  { id: slug("Chest Press"),              name:"Chest Press",              muscle:"Petto",     equipment:"Macchina",   modality:"Spinta" },
  { id: slug("Croci ai Cavi"),            name:"Croci ai Cavi",            muscle:"Petto",     equipment:"Cavi",       modality:"Spinta" },

  // Schiena (modality: Trazione)
  { id: slug("Lat Machine"),              name:"Lat Machine",              muscle:"Schiena",   equipment:"Macchina",   modality:"Trazione" },
  { id: slug("Rematore Manubrio"),        name:"Rematore Manubrio",        muscle:"Schiena",   equipment:"Manubri",    modality:"Trazione" },
  { id: slug("Trazioni alla Sbarra"),     name:"Trazioni alla Sbarra",     muscle:"Schiena",   equipment:"Corpo libero", modality:"Trazione" },
  { id: slug("Pulldown ai Cavi"),         name:"Pulldown ai Cavi",         muscle:"Schiena",   equipment:"Cavi",       modality:"Trazione" },

  // Gambe (modality: Gambe)
  { id: slug("Squat"),                    name:"Squat",                    muscle:"Gambe",     equipment:"Bilanciere", modality:"Gambe" },
  { id: slug("Affondi Manubri"),          name:"Affondi Manubri",          muscle:"Gambe",     equipment:"Manubri",    modality:"Gambe" },
  { id: slug("Leg Press"),                name:"Leg Press",                muscle:"Gambe",     equipment:"Macchina",   modality:"Gambe" },
  { id: slug("Stacchi Rumeni"),           name:"Stacchi Rumeni",           muscle:"Gambe",     equipment:"Bilanciere", modality:"Gambe" },
  { id: slug("Polpacci in Piedi"),        name:"Polpacci in Piedi",        muscle:"Gambe",     equipment:"Macchina",   modality:"Gambe" },

  // Spalle (modality: Spalle)
  { id: slug("Lento Avanti Bilanciere"),  name:"Lento Avanti Bilanciere",  muscle:"Spalle",    equipment:"Bilanciere", modality:"Spalle" },
  { id: slug("Arnold Press"),             name:"Arnold Press",             muscle:"Spalle",    equipment:"Manubri",    modality:"Spalle" },
  { id: slug("Alzate Laterali"),          name:"Alzate Laterali",          muscle:"Spalle",    equipment:"Manubri",    modality:"Spalle" },

  // Braccia (modality: Braccia)
  { id: slug("Curl Manubri"),             name:"Curl Manubri",             muscle:"Bicipiti",  equipment:"Manubri",    modality:"Braccia" },
  { id: slug("Curl Bilanciere"),          name:"Curl Bilanciere",          muscle:"Bicipiti",  equipment:"Bilanciere", modality:"Braccia" },
  { id: slug("Pushdown ai Cavi"),         name:"Pushdown ai Cavi",         muscle:"Tricipiti", equipment:"Cavi",       modality:"Braccia" },
  { id: slug("French Press"),             name:"French Press",             muscle:"Tricipiti", equipment:"Bilanciere", modality:"Braccia" },

  // Core (modality: Core)
  { id: slug("Plank"),                    name:"Plank",                    muscle:"Core",      equipment:"Corpo libero", modality:"Core" },
  { id: slug("Crunch su Panca"),          name:"Crunch su Panca",          muscle:"Core",      equipment:"Panca",      modality:"Core" },

  // Extra popolari (per dare più scelta)
  { id: slug("Panca Decline"),            name:"Panca Decline",            muscle:"Petto",     equipment:"Bilanciere", modality:"Spinta" },
  { id: slug("Pullover Manubrio"),        name:"Pullover Manubrio",        muscle:"Schiena",   equipment:"Manubri",    modality:"Trazione" },
  { id: slug("Rematore Bilanciere"),      name:"Rematore Bilanciere",      muscle:"Schiena",   equipment:"Bilanciere", modality:"Trazione" },
  { id: slug("Leg Curl"),                 name:"Leg Curl",                 muscle:"Gambe",     equipment:"Macchina",   modality:"Gambe" },
  { id: slug("Leg Extension"),            name:"Leg Extension",            muscle:"Gambe",     equipment:"Macchina",   modality:"Gambe" },
  { id: slug("Alzate Frontali"),          name:"Alzate Frontali",          muscle:"Spalle",    equipment:"Manubri",    modality:"Spalle" },
  { id: slug("Hammer Curl"),              name:"Hammer Curl",              muscle:"Bicipiti",  equipment:"Manubri",    modality:"Braccia" },
  { id: slug("Dip alle Parallele"),       name:"Dip alle Parallele",       muscle:"Tricipiti", equipment:"Corpo libero", modality:"Braccia" },
];

// Derivati per UI / filtri
export const EXERCISE_NAMES = EXERCISE_CATALOG.map(e => e.name);
export const EQUIPMENTS     = [...new Set(EXERCISE_CATALOG.map(e => e.equipment))].sort();
export const MODALITIES     = [...new Set(EXERCISE_CATALOG.map(e => e.modality))].sort();

// --- Libreria che usa il Builder (campo "equip" come si aspetta il componente)
export const EXERCISE_LIBRARY = EXERCISE_CATALOG.map(e => ({
  id: e.id,
  name: e.name,
  muscle: e.muscle,
  equip: e.equipment,       // conversione equipment -> equip per il builder
  // target di default (li potrai cambiare quando aggiungi l’esercizio in scheda)
  targetSets: 3,
  targetReps: 10,
  targetWeight: 20,
}));

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