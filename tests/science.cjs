const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ctx = vm.createContext({ window: {} });
for (const file of [
  "js/curriculum.js",
  "training-data.js",
  "science-data.js",
  "js/science-labs.js",
])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    ctx,
  );
const { ScienceLabs: L, TRAINING_MODULES: modules, Curriculum: C } = ctx.window;
// Independent atom counts over the entire coefficient control range.
for (let a = 1; a <= 8; a++)
  for (let b = 1; b <= 8; b++)
    for (let c = 1; c <= 8; c++) {
      const result = L.balance(a, b, c);
      assert.equal(result.balanced, a === 2 * c && 2 * b === 3 * c);
      assert.equal(result.minimal, a === 4 && b === 3 && c === 2);
    }
assert.equal(L.balance(8, 6, 4).balanced, true);
assert.equal(L.balance(8, 6, 4).minimal, false);
const alleleProbability = { AA: 1, Aa: 0.5, aa: 0 };
for (const [a, p] of Object.entries(alleleProbability))
  for (const [b, q] of Object.entries(alleleProbability)) {
    const result = L.cross(a, b);
    assert.equal(result.counts.AA / 4, p * q);
    assert.equal(result.counts.Aa / 4, p * (1 - q) + (1 - p) * q);
    assert.equal(result.counts.aa / 4, (1 - p) * (1 - q));
    assert.equal(result.dominant + result.recessive, 1);
    assert.equal(
      JSON.stringify(result.counts),
      JSON.stringify(L.cross(b, a).counts),
    );
    assert.equal(
      result.heterozygousGivenDominant,
      result.dominant ? result.counts.Aa / 4 / result.dominant : null,
    );
  }
assert.equal(L.cross("Aa", "Aa").heterozygousGivenDominant, 2 / 3);
assert.equal(L.cross("aa", "aa").heterozygousGivenDominant, null);
assert.throws(() => L.cross("AB", "Aa"));
// Check chemistry answers against elemental composition, not answer indices alone.
const balanceModule = modules.find((m) => m.id === "balance");
function coefficients(q) {
  return q.options[q.answer].split("、").map(Number);
}
const [a, b, c] = coefficients(balanceModule.qs[0]);
assert(L.balance(a, b, c).minimal);
const [propane, oxygen, co2, water] = coefficients(balanceModule.qs[5]);
assert.equal(3 * propane, co2);
assert.equal(8 * propane, 2 * water);
assert.equal(2 * oxygen, 2 * co2 + water);
for (const id of ["balance", "inheritance"]) {
  const module = modules.find((m) => m.id === id);
  assert.equal(module.qs.length, 6);
  assert.equal(C.get(id).training, id);
  assert(C.subjects.find((s) => s.id === C.get(id).subject).available);
}
console.log(
  "PASS: coefficient conservation/minimality, all nine crosses, conditional probabilities, chemistry answer conservation and curriculum routing.",
);
