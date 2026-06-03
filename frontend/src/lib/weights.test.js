import assert from "node:assert/strict";
import test from "node:test";

import { completeWeights, importancesToWeights, percentagesToImportances } from "./weights.js";

test("critical experience with low other categories is decisive", () => {
  const weights = importancesToWeights({
    skills: 1,
    experience: 5,
    education: 1,
    domain_fit: 1,
  });

  assert.equal(Object.values(weights).reduce((sum, value) => sum + value, 0), 100);
  assert.equal(weights.experience, 84);
  assert.ok(weights.experience > weights.skills + weights.education + weights.domain_fit);
});

test("equal importances split evenly", () => {
  assert.deepEqual(
    importancesToWeights({ skills: 3, experience: 3, education: 3, domain_fit: 3 }),
    { skills: 25, experience: 25, education: 25, domain_fit: 25 }
  );
});

test("missing explicit weights are completed with zeroes", () => {
  assert.deepEqual(completeWeights({ experience: 100 }), {
    skills: 0,
    experience: 100,
    education: 0,
    domain_fit: 0,
  });
});

test("saved weights can be rendered as importance levels", () => {
  assert.deepEqual(percentagesToImportances({ skills: 6, experience: 84, education: 5, domain_fit: 5 }), {
    skills: 1,
    experience: 5,
    education: 1,
    domain_fit: 1,
  });
});
