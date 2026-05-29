export function countInversions(values) {
  const steps = [];
  const normalized = values.map((value, index) => ({ value, index }));
  const result = mergeCount(normalized, 0, steps);

  return {
    count: result.count,
    sorted: result.sorted.map((entry) => entry.value),
    steps,
  };
}

function mergeCount(items, depth, steps) {
  if (items.length <= 1) {
    return { sorted: items, count: 0 };
  }

  const middle = Math.floor(items.length / 2);
  const left = mergeCount(items.slice(0, middle), depth + 1, steps);
  const right = mergeCount(items.slice(middle), depth + 1, steps);
  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;
  let splitInversions = 0;

  while (leftIndex < left.sorted.length && rightIndex < right.sorted.length) {
    if (left.sorted[leftIndex].value <= right.sorted[rightIndex].value) {
      merged.push(left.sorted[leftIndex]);
      leftIndex += 1;
    } else {
      merged.push(right.sorted[rightIndex]);
      splitInversions += left.sorted.length - leftIndex;
      rightIndex += 1;
    }
  }

  while (leftIndex < left.sorted.length) {
    merged.push(left.sorted[leftIndex]);
    leftIndex += 1;
  }

  while (rightIndex < right.sorted.length) {
    merged.push(right.sorted[rightIndex]);
    rightIndex += 1;
  }

  steps.push({
    depth,
    left: left.sorted.map((entry) => entry.value),
    right: right.sorted.map((entry) => entry.value),
    merged: merged.map((entry) => entry.value),
    splitInversions,
    totalInversions: left.count + right.count + splitInversions,
  });

  return {
    sorted: merged,
    count: left.count + right.count + splitInversions,
  };
}

export function orderToInversionArray(startOrder, finishOrder) {
  const startPosition = new Map(startOrder.map((driverId, index) => [driverId, index]));
  return finishOrder.map((driverId) => startPosition.get(driverId));
}

export function maxInversions(size) {
  return (size * (size - 1)) / 2;
}
