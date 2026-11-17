/** IGCSE wording. The models are shared between IGCSE and AS / A Level, and
 * many labels were written for the full model ("rigid massless link",
 * "RMS voltage", "flux"). While the IGCSE level is selected, every label is
 * passed through these rules: advanced wording is replaced with the words the
 * 0625 syllabus uses, and labels that only make sense at A Level are dropped.
 * Numbers inside a label are kept exactly as the model produced them. */

/** [pattern, replacement]. A replacement of null removes the label. */
export const IGCSE_RULES = [
  // Pendulum
  [/^(L = \S+ m) · rigid massless link.*$/, "$1"],
  [/^Rigid link can pull or push.*$/, null],
  [/^T₀ .*\(undamped\)$/, null],
  [/^K (\S+ J) · U (\S+ J) · damping .*$/, "KE $1 · GPE $2"],
  [/^Gold: velocity · purple: total acceleration.*$/, "Gold arrow: velocity"],
  // Moments
  [/^Angular stops · (.+)$/, "Beam stops at $1"],
  // Motion and measurement
  [/ · exact linear drag$/, " · with air resistance"],
  [/endpoint uncertainty/g, "the effect of reaction time"],
  [/^Ideal ruler · model timing$/, "Ruler and stopwatch"],
  // Thermal
  [/^Exact lumped Newton cooling · no evaporation$/, "No evaporation"],
  // Magnetism and charged particles
  [/^μ₀ ≈ .* · field-line sketch$/, "Field-line sketch"],
  [/^r = .* · \|F\| = .*$/, null],
  [/^⊙ out · \|B\| = .*$/, "⊙ Magnetic field out of the page"],
  [/^Uniform field · one fixed position scale per setup$/, "Uniform magnetic field"],
  // Space
  [/^Hubble-law snapshot.*$/, "Hubble’s law snapshot"],
  [/^Low-z Hubble model.*$/, "Galaxies moving apart"],
  [/^z ≈ .*$/, null],
  [/^Qualitative stages · analytic reference estimates$/, "Qualitative stages"],
  // Radioactivity and the atom
  [/^Seed \d+ · each nucleus has an exponential waiting time$/, "Each nucleus decays at random"],
  [/^Trajectories schematic; angle computed for selected b\.$/, "The paths are a sketch"],
  // Sound
  [/^Fixed 2 m window · slowed clock · schematic parcel displacement$/, "Slowed down so you can watch"],
  [/^(λ = \S+ m) · c = (\S+ m\/s)$/, "$1 · v = $2"],
  // Lenses
  [/^Signed distances · heights linear$/, "Distances measured from the lens"],
  [/^v = (\S+ cm) · m = -?[\d.]+$/, "Image $1 from the lens"],
  // Pressure and electricity
  [/^Quasistatic · shared travel scale$/, "Pressed slowly and steadily"],
  [/^Unloaded divider · ideal comparator$/, "Potential divider"],
  // Transformer
  [/^Shared changing flux$/, "Changing magnetic field in the core"],
  [/^Flux passes through zero · voltage is at a peak$/, "Field changing fastest · voltage is at a peak"],
  [/^Changing core flux induces the secondary voltage$/, "A changing magnetic field in the core induces the secondary voltage"],
  [/^RMS readouts · .*$/, "AC slowed down for display"],
  [/\b(Primary|Secondary) RMS (voltage|current)\b/g, "$1 $2"],
  [/^Maximum flux$/, null],
  [/^Compare the voltage with the changing core flux$/, "Compare the voltage with the changing magnetic field in the core"],
  // Floating and sinking: keep the idea, drop the drag model and the A Level law
  [/^Upthrust uses the actual submerged volume\..*$/, null],
  [/^Read Archimedes’ principle · OpenStax ↗$/, null],
  // Magnetism
  [/^Signed reference field = .*$/, null],
  // Optics
  [/^Unpolarised reflected fraction$/, null],
  // Application notes written for the full model
  [/^Musical instruments, microwave cavities, optical resonators and vibration analysis use interference and standing modes\.$/,
    "Musical instruments, ripple tanks and earthquake detectors all depend on how waves reflect and spread."],
  [/^Electrostatic sensing, particle deflection, capacitor design and charged-particle optics all depend on electric fields and potential\.$/,
    "Photocopiers, paint sprayers and smoke-stack dust filters all use electric charge and electric fields."],
];

const cache = new Map();
/** The IGCSE form of a label, or null when the label should not appear. */
export function igcseWording(text) {
  if (typeof text !== "string" || !text) return text;
  if (cache.has(text)) return cache.get(text);
  let out = text;
  for (const [pattern, replacement] of IGCSE_RULES) {
    pattern.lastIndex = 0;
    if (!pattern.test(out)) continue;
    pattern.lastIndex = 0;
    if (replacement === null) {
      out = null;
      break;
    }
    out = out.replace(pattern, replacement);
  }
  if (cache.size > 4000) cache.clear();
  cache.set(text, out);
  return out;
}

let level = null;
export const wordingLevel = () => level;
/** Called when an experiment opens or its level changes. */
export function setWordingLevel(mode) {
  level = mode === "igcse" ? "igcse" : null;
}
/** Text as it should be shown at the current level ("" when it is dropped). */
export function levelText(text) {
  return level === "igcse" ? (igcseWording(text) ?? "") : text;
}

/** Route every canvas label through the rules. The 2D diagrams, the 3D label
 * sprites and the graphs all draw their text with fillText, so one wrapper
 * covers them without touching each of the 59 scenes. measureText is wrapped
 * too, so label boxes fit the reworded text. */
let installed = false;
export function installCanvasWording() {
  if (installed || typeof CanvasRenderingContext2D === "undefined") return;
  installed = true;
  const proto = CanvasRenderingContext2D.prototype;
  for (const name of ["fillText", "strokeText", "measureText"]) {
    const original = proto[name];
    proto[name] = function (text, ...rest) {
      if (level === "igcse" && typeof text === "string") {
        const shown = igcseWording(text);
        if (shown === null) return name === "measureText" ? original.call(this, "", ...rest) : undefined;
        text = shown;
      }
      return original.call(this, text, ...rest);
    };
  }
}

/** Reword live text inside a page region (readouts, consoles) while IGCSE is selected. */
export function watchText(root) {
  if (!root || typeof MutationObserver === "undefined") return () => {};
  const fix = (node) => {
    if (level !== "igcse" || node.nodeType !== 3) return;
    const shown = igcseWording(node.nodeValue.trim());
    if (shown === node.nodeValue.trim()) return;
    if (shown === null) {
      const box = node.parentElement?.closest(".metric, .readout, li, p, span");
      if (box) box.hidden = true;
      node.nodeValue = "";
    } else node.nodeValue = shown;
  };
  const walk = (node) => {
    if (node.nodeType === 3) return fix(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) fix(walker.currentNode);
  };
  walk(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") fix(record.target);
      else record.addedNodes.forEach(walk);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true });
  return () => observer.disconnect();
}
