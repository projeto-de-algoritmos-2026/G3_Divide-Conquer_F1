import assert from "node:assert/strict";
import { countInversions, maxInversions, orderToInversionArray } from "../src/inversions.js";

const sorted = countInversions([0, 1, 2, 3]);
assert.equal(sorted.count, 0);

const reversed = countInversions([3, 2, 1, 0]);
assert.equal(reversed.count, 6);
assert.equal(maxInversions(4), 6);

const startOrder = ["a", "b", "c", "d"];
const finishOrder = ["b", "d", "a", "c"];
const inversionArray = orderToInversionArray(startOrder, finishOrder);
assert.deepEqual(inversionArray, [1, 3, 0, 2]);
assert.equal(countInversions(inversionArray).count, 3);

console.log("Todos os testes de inversões passaram.");
