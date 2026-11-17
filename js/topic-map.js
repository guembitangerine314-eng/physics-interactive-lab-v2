/** Topic-first navigation: home → one of six IGCSE areas → experiment.
 * Ordering comes from the syllabus references already stored in each IGCSE
 * learning profile, so no syllabus heading text is reproduced here. */
import { SIMULATIONS } from "./simulations.js";
import { availableModes, getProfile } from "./learning-paths.js";
import { IGCSE_AREAS, igcseArea, studyTitle } from "./study-policy.js";

/** One accent per area. The backdrop, topic rail and topic page share them. */
export const TOPICS = IGCSE_AREAS.map((name, i) => ({
  number: i + 1,
  name,
  slug: `topic-${i + 1}`,
  short: ["Motion", "Thermal", "Waves", "Electricity", "Nuclear", "Space"][i],
  accent: ["#6fb4ff", "#ff9d6e", "#45d8d2", "#ffc55c", "#c3a4ff", "#8fb0ff"][i],
  scene: [
    "A pendulum keeps time",
    "Particles in a box",
    "Two sources, one pattern",
    "Field lines between charges",
    "Alpha, beta and gamma tracks",
    "Planets in orbit",
  ][i],
}));

/** Full-model categories that sit closest to each IGCSE area. */
const CATEGORY_TOPIC = {
  Mechanics: 1, Oscillations: 1, "Thermal physics": 2, Waves: 3, Optics: 3,
  Electricity: 4, Magnetism: 4, "Nuclear physics": 5, "Quantum physics": 5,
  "Space physics": 6, Astrophysics: 6,
};

/** "1.5.2" → [1, 5, 2] so that 1.10 would sort after 1.9. */
export const refKey = (ref) => String(ref).split(".").map(Number);
export function compareRefs(a, b) {
  const x = refKey(a), y = refKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

const isIGCSE = (id) => availableModes(id).includes("igcse");

/** Topic number (1–6) for any experiment, IGCSE or not. */
export function topicOf(id) {
  if (!Object.hasOwn(SIMULATIONS, id)) return null;
  if (isIGCSE(id)) return IGCSE_AREAS.indexOf(igcseArea(id)) + 1 || null;
  return CATEGORY_TOPIC[SIMULATIONS[id].category] ?? null;
}

/** IGCSE experiments of one area in syllabus order. */
export function topicExperiments(number) {
  return Object.keys(SIMULATIONS)
    .filter((id) => isIGCSE(id) && topicOf(id) === number)
    .map((id) => {
      const profile = getProfile(id, "igcse");
      return {
        id,
        refs: profile.refs,
        title: studyTitle(id, "igcse", SIMULATIONS[id].short),
        goals: profile.goals,
      };
    })
    .sort((a, b) => compareRefs(a.refs[0], b.refs[0]) || a.title.localeCompare(b.title));
}

/** A Level and enrichment models related to an area: the "go further" shelf. */
export function topicExtensions(number) {
  return Object.keys(SIMULATIONS)
    .filter((id) => !isIGCSE(id) && topicOf(id) === number)
    .map((id) => ({
      id,
      title: SIMULATIONS[id].short,
      level: availableModes(id).includes("alevel") ? "A Level" : "Enrichment",
    }));
}

/** Previous and next experiment inside the same topic, for lab-page stepping. */
export function topicNeighbours(id) {
  const number = topicOf(id);
  if (!number || !isIGCSE(id)) return { number, previous: null, next: null, index: -1, total: 0 };
  const list = topicExperiments(number), index = list.findIndex((e) => e.id === id);
  return {
    number,
    index,
    total: list.length,
    previous: list[index - 1] ?? null,
    next: list[index + 1] ?? null,
  };
}

/** Search used by the home page: every experiment, IGCSE titles first. */
export function searchExperiments(query, limit = 7) {
  const q = String(query).toLowerCase().trim();
  if (!q) return [];
  return Object.entries(SIMULATIONS)
    .map(([id, d]) => {
      const igcse = isIGCSE(id),
        title = igcse ? studyTitle(id, "igcse", d.short) : d.short,
        haystack = `${title} ${d.short} ${d.title} ${d.category} ${d.summary}`.toLowerCase(),
        lower = title.toLowerCase(), at = lower.indexOf(q),
        wordStart = lower.split(/[^a-z0-9]+/).some((word) => word.startsWith(q));
      if (!haystack.includes(q)) return null;
      // Start of the title, then start of a word in it ("len" finds lenses before
      // wavelength), then anywhere in the title, then the description.
      return { id, title, igcse, topic: topicOf(id), rank: at === 0 ? 0 : wordStart ? 1 : at > 0 ? 2 : 3 };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || Number(b.igcse) - Number(a.igcse) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export const topicBySlug = (slug) => TOPICS.find((t) => t.slug === slug) ?? null;
