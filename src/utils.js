// src/utils.js
// Catalogo esercizi + util di base (teniamo qui i dati e li riesportiamo da data.js)

export const MUSCLE_GROUPS = [
  "Petto","Schiena","Gambe","Spalle","Bicipiti","Tricipiti","Core","Altro"
];

export function capWords(s = "") {
  return s.split(" ")
    .filter(Boolean)
    .map(w => (w[0]?.toUpperCase() || "") + (w.slice(1) || "").toLowerCase())
    .join(" ");
}

function slug(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

// ====== Catalogo esercizi esteso ======
export const EXERCISE_CATALOG = [
  // Petto
  { id: slug("Panca Piana"),             name:"Panca Piana",             muscle:"Petto",     equipment:"Bilanciere" },
  { id: slug("Panca Inclinata Manubri"), name:"Panca Inclinata Manubri", muscle:"Petto",     equipment:"Manubri" },
  { id: slug("Chest Press"),             name:"Chest Press",             muscle:"Petto",     equipment:"Macchina" },
  { id: slug("Croci ai Cavi"),           name:"Croci ai Cavi",           muscle:"Petto",     equipment:"Cavi" },

  // Schiena
  { id: slug("Lat Machine"),             name:"Lat Machine",             muscle:"Schiena",   equipment:"Macchina" },
  { id: slug("Rematore Manubrio"),       name:"Rematore Manubrio",       muscle:"Schiena",   equipment:"Manubri" },
  { id: slug("Rematore Bilanciere"),     name:"Rematore Bilanciere",     muscle:"Schiena",   equipment:"Bilanciere" },
  { id: slug("Trazioni alla Sbarra"),    name:"Trazioni alla Sbarra",    muscle:"Schiena",   equipment:"Corpo libero" },
  { id: slug("Pulldown ai Cavi"),        name:"Pulldown ai Cavi",        muscle:"Schiena",   equipment:"Cavi" },

  // Gambe
  { id: slug("Squat"),                   name:"Squat",                   muscle:"Gambe",     equipment:"Bilanciere" },
  { id: slug("Affondi Manubri"),         name:"Affondi Manubri",         muscle:"Gambe",     equipment:"Manubri" },
  { id: slug("Leg Press"),               name:"Leg Press",               muscle:"Gambe",     equipment:"Macchina" },
  { id: slug("Stacchi Rumeni"),          name:"Stacchi Rumeni",          muscle:"Gambe",     equipment:"Bilanciere" },
  { id: slug("Polpacci in Piedi"),       name:"Polpacci in Piedi",       muscle:"Gambe",     equipment:"Macchina" },

  // Spalle
  { id: slug("Lento Avanti Bilanciere"), name:"Lento Avanti Bilanciere", muscle:"Spalle",    equipment:"Bilanciere" },
  { id: slug("Arnold Press"),            name:"Arnold Press",            muscle:"Spalle",    equipment:"Manubri" },
  { id: slug("Alzate Laterali"),         name:"Alzate Laterali",         muscle:"Spalle",    equipment:"Manubri" },
  { id: slug("Military Press"),          name:"Military Press",          muscle:"Spalle",    equipment:"Bilanciere" },

  // Braccia
  { id: slug("Curl Manubri"),            name:"Curl Manubri",            muscle:"Bicipiti",  equipment:"Manubri" },
  { id: slug("Curl Bilanciere"),         name:"Curl Bilanciere",         muscle:"Bicipiti",  equipment:"Bilanciere" },
  { id: slug("Hammer Curl"),             name:"Hammer Curl",             muscle:"Bicipiti",  equipment:"Manubri" },
  { id: slug("Pushdown ai Cavi"),        name:"Pushdown ai Cavi",        muscle:"Tricipiti", equipment:"Cavi" },
  { id: slug("French Press"),            name:"French Press",            muscle:"Tricipiti", equipment:"Bilanciere" },
  { id: slug("Dip alle Parallele"),      name:"Dip alle Parallele",      muscle:"Tricipiti", equipment:"Corpo libero" },

  // Core
  { id: slug("Plank"),                   name:"Plank",                   muscle:"Core",      equipment:"Corpo libero" },
  { id: slug("Crunch su Panca"),         name:"Crunch su Panca",         muscle:"Core",      equipment:"Panca" },
  { id: slug("Sit Up con Alzata"),       name:"Sit Up con Alzata",       muscle:"Core",      equipment:"Panca" },
  { id: slug("Russian Twist"),           name:"Russian Twist",           muscle:"Core",      equipment:"Manubri" },

  // Extra richiesti da te
  { id: slug("Slanci ai Cavi"),          name:"Slanci ai Cavi",          muscle:"Gambe",     equipment:"Cavi" },
  { id: slug("Hip Thrust Macchinario"),  name:"Hip Thrust Macchinario",  muscle:"Glutei",    equipment:"Macchina" },
  { id: slug("Hip Thrust"),              name:"Hip Thrust",              muscle:"Glutei",    equipment:"Bilanciere" },
  { id: slug("Abductor Machine"),        name:"Abductor Machine",        muscle:"Glutei",    equipment:"Macchina" },
  { id: slug("Pulley"),                  name:"Pulley",                  muscle:"Schiena",   equipment:"Cavi" },
  { id: slug("Panca Inclinata"),         name:"Panca Inclinata",         muscle:"Petto",     equipment:"Bilanciere" },
  { id: slug("Crab Walk"),               name:"Crab Walk",               muscle:"Gambe",     equipment:"Elastici" },
  { id: slug("Deadlift"),                name:"Deadlift",                muscle:"Gambe",     equipment:"Bilanciere" },
  { id: slug("Affondi Camminata"),       name:"Affondi Camminata",       muscle:"Gambe",     equipment:"Manubri" },
];

export const EXERCISE_NAMES = EXERCISE_CATALOG.map(e => e.name);
export const EQUIPMENTS     = [...new Set(EXERCISE_CATALOG.map(e => e.equipment))].sort();

// Il builder si aspetta "equip"
export const EXERCISE_LIBRARY = EXERCISE_CATALOG.map(e => ({
  id: e.id, name: e.name, muscle: e.muscle, equip: e.equipment,
  targetSets: 3, targetReps: 10, targetWeight: 20,
}));

// Heuristics per gruppo, utile lato Allenamenti
export function detectGroup(name = "") {
  const n = name.toLowerCase();
  const rules = [
    [/panca|chest|petto/,                         "Petto"],
    [/lat machine|rematore|pull.?down|trazioni|row|pulley|pullover|schiena/, "Schiena"],
    [/squat|affondi|pressa|stacchi|leg|quad|hamstring|calf|polpacci|glute|hip thrust/, "Gambe"],
    [/spalle|shoulder|lateral|military|arnold|overhead/, "Spalle"],
    [/bicipit|curl|hammer/,                         "Bicipiti"],
    [/tricipit|french|pushdown|dips|dip/,           "Tricipiti"],
    [/addom|core|crunch|plank|obliqu|sit up|russian/, "Core"],
  ];
  for (const [re, g] of rules) if (re.test(n)) return g;
  const found = EXERCISE_CATALOG.find(e => e.name.toLowerCase() === n);
  return found?.muscle ?? "Altro";
}