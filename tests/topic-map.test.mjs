import test from "node:test";
import assert from "node:assert/strict";
import { SIMULATIONS } from "../js/simulations.js";
import { availableModes } from "../js/learning-paths.js";
import {
  TOPICS, compareRefs, topicOf, topicExperiments, topicExtensions,
  topicNeighbours, searchExperiments, topicBySlug,
} from "../js/topic-map.js";
import { bounce, seeded, sceneFrame, dipoleLine } from "../js/field-backdrop.js";

test("there are six IGCSE topics with routable slugs and six-digit accents", () => {
  assert.equal(TOPICS.length, 6);
  TOPICS.forEach((t, i) => {
    assert.equal(t.number, i + 1);
    assert.equal(topicBySlug(t.slug), t);
    assert.match(t.accent, /^#[0-9a-f]{6}$/);
    assert.ok(!Object.hasOwn(SIMULATIONS, t.slug), "A topic route must not shadow an experiment.");
  });
  assert.equal(topicBySlug("pendulum"), null);
});

test("every IGCSE experiment appears in exactly one topic", () => {
  const listed = TOPICS.flatMap((t) => topicExperiments(t.number).map((e) => e.id)),
    igcse = Object.keys(SIMULATIONS).filter((id) => availableModes(id).includes("igcse"));
  assert.equal(new Set(listed).size, listed.length);
  assert.deepEqual([...listed].sort(), [...igcse].sort());
});

test("experiments inside a topic follow syllabus order and belong to it", () => {
  for (const t of TOPICS) {
    const list = topicExperiments(t.number);
    assert.ok(list.length > 0);
    list.forEach((e, i) => {
      assert.equal(Number(e.refs[0].split(".")[0]), t.number);
      if (i) assert.ok(compareRefs(list[i - 1].refs[0], e.refs[0]) <= 0);
    });
  }
});

test("section references compare numerically, not as text", () => {
  assert.ok(compareRefs("1.9", "1.10") < 0);
  assert.ok(compareRefs("1.5", "1.5.1") < 0);
  assert.equal(compareRefs("4.2.4", "4.2.4"), 0);
});

test("every experiment has a topic, and extensions never repeat IGCSE ones", () => {
  for (const id of Object.keys(SIMULATIONS)) assert.ok(topicOf(id) >= 1 && topicOf(id) <= 6, id);
  const extra = TOPICS.flatMap((t) => topicExtensions(t.number).map((e) => e.id));
  assert.ok(extra.every((id) => !availableModes(id).includes("igcse")));
  const igcseCount = TOPICS.reduce((n, t) => n + topicExperiments(t.number).length, 0);
  assert.equal(igcseCount + extra.length, Object.keys(SIMULATIONS).length);
});

test("previous and next walk a topic from end to end", () => {
  for (const t of TOPICS) {
    const list = topicExperiments(t.number);
    assert.equal(topicNeighbours(list[0].id).previous, null);
    assert.equal(topicNeighbours(list.at(-1).id).next, null);
    let id = list[0].id, seen = 1;
    while (topicNeighbours(id).next) {
      id = topicNeighbours(id).next.id;
      seen++;
    }
    assert.equal(seen, list.length);
  }
  assert.equal(topicNeighbours("gravity").index, -1);
});

test("search prefers word starts and returns nothing for an empty query", () => {
  assert.deepEqual(searchExperiments("  "), []);
  assert.equal(searchExperiments("len")[0].id, "lenses");
  assert.equal(searchExperiments("pendulum")[0].id, "pendulum");
  assert.ok(searchExperiments("zzzz").length === 0);
  assert.ok(searchExperiments("a", 4).length <= 4);
});

test("backdrop helpers stay inside their bounds", () => {
  for (let x = -50; x < 50; x += 0.37) {
    const b = bounce(x, 7);
    assert.ok(b >= 0 && b <= 7);
  }
  assert.equal(bounce(3, 7), 3);
  assert.equal(bounce(10, 7), 4);
  for (let i = 0; i < 200; i++) assert.ok(seeded(i, 3) >= 0 && seeded(i, 3) < 1);
  assert.equal(seeded(5, 2), seeded(5, 2));
  const wide = sceneFrame(1440, 900), phone = sceneFrame(390, 844);
  assert.ok(wide.cx > 1440 / 2 && phone.cx === 195);
});

test("a dipole field line leaves the positive charge and ends at the negative one", () => {
  const line = dipoleLine(0.4), [x0, y0] = line[0], [x1, y1] = line.at(-1);
  assert.ok(Math.hypot(x0 + 1, y0) < 0.1);
  assert.ok(Math.hypot(x1 - 1, y1) < 0.1);
  // A line that starts by heading away from the negative charge runs out of reach instead.
  const away = dipoleLine(Math.PI).at(-1);
  assert.ok(Math.hypot(away[0], away[1]) > 3.5);
});
