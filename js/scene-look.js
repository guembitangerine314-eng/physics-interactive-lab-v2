/** The shared look of every 3D experiment: a dark studio in the manner of the
 * team's "Since 1958" project. A graphite bench under a pool of light, a deep
 * backdrop, parts that glow where they are lit, and small crisp labels.
 * Display only: nothing here reads or changes a model. Everything is drawn
 * once into small canvases, so there is no post-processing cost per frame. */
import * as T from "../vendor/three.module.min.js";

const made = new Map();
const once = (key, make) => (made.has(key) ? made.get(key) : (made.set(key, make()), made.get(key)));
const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
const noise = (i, k = 0) => {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Deep studio backdrop: a soft glow behind the apparatus falling to black. */
export function studioBackdropTexture() {
  const c = canvas(512, 512), g = c.getContext("2d"),
    glow = g.createRadialGradient(256, 250, 0, 256, 250, 380);
  glow.addColorStop(0, "#2b3443");
  glow.addColorStop(0.35, "#171c25");
  glow.addColorStop(0.75, "#0a0c10");
  glow.addColorStop(1, "#050608");
  g.fillStyle = glow;
  g.fillRect(0, 0, 512, 512);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

/** Honed graphite bench: faint mottling so reflections break up like stone. */
function benchRoughness() {
  return once("bench-rough", () => {
    const c = canvas(256, 256), g = c.getContext("2d"), image = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const v = 120 + noise(i, 3) * 50 + noise(Math.floor(i / 7), 5) * 28;
      image.data.set([v, v, v, 255], i * 4);
    }
    g.putImageData(image, 0, 0);
    const texture = new T.CanvasTexture(c);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
  });
}
function radialTexture(key, stops) {
  return once(key, () => {
    const c = canvas(256, 256), g = c.getContext("2d"), fill = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (const [at, color] of stops) fill.addColorStop(at, color);
    g.fillStyle = fill;
    g.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  });
}
export function benchMaterial() {
  return new T.MeshStandardMaterial({
    color: 0x15181d,
    roughness: 0.62,
    roughnessMap: benchRoughness(),
    metalness: 0.05,
    envMapIntensity: 0.6,
    alphaMap: radialTexture("bench-fade", [[0, "#fff"], [0.4, "#fff"], [0.8, "#333"], [1, "#000"]]),
    transparent: true,
    depthWrite: false,
  });
}
/** A warm pool of light on the bench under the apparatus. */
export function lightPool() {
  const texture = radialTexture("pool", [[0, "rgba(255,236,214,0.55)"], [0.35, "rgba(255,226,200,0.22)"], [1, "rgba(255,220,190,0)"]]);
  texture.colorSpace = T.SRGBColorSpace;
  const pool = new T.Mesh(
    new T.CircleGeometry(11, 48),
    new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.26, toneMapped: false, fog: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = -1;
  return pool;
}

/** Soft halo for parts that emit light: lamps, hot filaments, charges, beams. */
function haloTexture() {
  const texture = radialTexture("halo", [[0, "rgba(255,255,255,0.9)"], [0.22, "rgba(255,255,255,0.32)"], [0.6, "rgba(255,255,255,0.07)"], [1, "rgba(255,255,255,0)"]]);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
const sphere = new T.Sphere(), size = new T.Vector3();
/** Give each small, strongly emissive mesh a halo. Returns how many were added. */
export function addGlow(root, { limit = 40 } = {}) {
  const targets = [];
  root.traverse((node) => {
    if (targets.length >= limit || !node.isMesh || node.isInstancedMesh || node.userData.halo) return;
    const m = node.material;
    if (!m || Array.isArray(m) || !m.emissive || (m.emissiveIntensity ?? 0) < 0.55) return;
    if (m.emissive.r + m.emissive.g + m.emissive.b < 0.25 || (m.transparent && m.opacity < 0.35)) return;
    node.geometry.computeBoundingSphere?.();
    const radius = node.geometry.boundingSphere?.radius ?? 0;
    node.getWorldScale(size);
    const world = radius * Math.max(size.x, size.y, size.z);
    if (world > 0.02 && world < 0.7) targets.push([node, radius]);
  });
  for (const [node, radius] of targets) {
    const halo = new T.Sprite(new T.SpriteMaterial({
      map: haloTexture(), color: node.material.emissive, transparent: true, opacity: 0.55,
      blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
    }));
    halo.scale.setScalar(radius * 5.5);
    halo.userData.role = "indicator";
    halo.raycast = () => {};
    node.userData.halo = halo;
    node.add(halo);
  }
  void sphere;
  return targets.length;
}

/** Label plate. "dark" floats over the scene, "paper" sits on a white board. */
export function paintLabelPlate(c, width, height, color, theme = "dark") {
  if (theme === "ink") return;
  const r = Math.min(height * 0.3, 22);
  c.beginPath();
  c.roundRect(3, 3, width - 6, height - 6, r);
  if (theme === "paper") {
    c.fillStyle = "rgba(252,252,250,0.97)";
    c.fill();
    c.strokeStyle = "rgba(40,44,52,0.18)";
    c.lineWidth = 2;
    c.stroke();
    return;
  }
  c.fillStyle = "rgba(8,10,14,0.80)";
  c.fill();
  c.globalAlpha = 0.55;
  c.strokeStyle = color;
  c.lineWidth = 2.5;
  c.stroke();
  c.globalAlpha = 1;
}
export const LABEL_FONT = "650 60px Manrope,Segoe UI,sans-serif";
