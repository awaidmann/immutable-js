import { DELETE } from './TrieUtils';

import { KeyedCollection } from './Collection';

import { setIn } from './methods/setIn';
import { deleteIn } from './methods/deleteIn';
import { update } from './methods/update';
import { updateIn } from './methods/updateIn';
import { merge, mergeWith } from './methods/merge';
import { mergeDeep, mergeDeepWith } from './methods/mergeDeep';
import { mergeIn } from './methods/mergeIn';
import { mergeDeepIn } from './methods/mergeDeepIn';
import { withMutations } from './methods/withMutations';
import { asMutable } from './methods/asMutable';
import { asImmutable } from './methods/asImmutable';
import { wasAltered } from './methods/wasAltered';

export class PriorityQueue extends KeyedCollection {
  constructor(comparator, heap) {
    this.heap = heap || new Array()
    this.comparator = comparator || defaultComparator
  }

  // @pragma Access

  get(k, notSetValue) {}

  peek() {}

  // @pragma Modification

  set(k, p, v) {
    return new PriorityQueue(
      this.comparator,
      updateHeap(this.comparator, this.heap, p, k, v))
  }

  pop() {
    return new PriorityQueue(
      this.comparator,
      updateHeap(this.comparator, this.heap))
  }

  push(k, p, v) {
    return new PriorityQueue(
      this.comparator,
      updateHeap(this.comparator, this.heap, p, k))
  }

  pushAll(iter) {}

  remove(k) {
    return new PriorityQueue(
      this.comparator,
      updateHeap(this.comparator, this.heap, undefined, undefined, k))
  }

  deleteAll(keys) {}
}

export function isPriorityQueue(maybePriorityQueue) {
  return !!(maybePriorityQueue && maybePriorityQueue[IS_PRIORITY_QUEUE_SENTINEL]);
}

PriorityQueue.isPriorityQueue = isPriorityQueue;

const IS_PRIORITY_QUEUE_SENTINEL = '@@__IMMUTABLE_PRIORITY_QUEUE__@@';

export const PQPrototype = PriorityQueue.prototype;
PQPrototype[IS_PRIORITY_QUEUE_SENTINEL] = true;
PQPrototype[DELETE] = PQPrototype.remove;
PQPrototype.removeAll = PQPrototype.deleteAll;
PQPrototype.shift = PQPrototype.pop;
PQPrototype.unshift = PQPrototype.push;
PQPrototype.unshiftAll = PQPrototype.pushAll;
PQPrototype.setIn = setIn;
PQPrototype.removeIn = PQPrototype.deleteIn = deleteIn;
PQPrototype.update = update;
PQPrototype.updateIn = updateIn;
PQPrototype.merge = PQPrototype.concat = merge;
PQPrototype.mergeWith = mergeWith;
PQPrototype.mergeDeep = mergeDeep;
PQPrototype.mergeDeepWith = mergeDeepWith;
PQPrototype.mergeIn = mergeIn;
PQPrototype.mergeDeepIn = mergeDeepIn;
PQPrototype.withMutations = withMutations;
PQPrototype.wasAltered = wasAltered;
PQPrototype.asImmutable = asImmutable;

function updateHeap(comparator, heap, priority, keyHash, idx) {
  if (idx < 0 || idx >= heap.length) return heap

  comparator = comparator || defaultComparator
  const newHeap = heap.slice()
  let heapUpdateIdxs = []

  if (!(priority === undefined || priority === null) && keyHash) {
    const moving = [priority, keyHash]
    if (idx === undefined || idx === null) {
      heapUpdateIdxs = siftUp(comparator, newHeap, moving, heap.length)
    } else {
      const compare = comparator(heap[idx][0], priority)
      heapUpdateIdxs = compare > 0
        ? siftUp(comparator, newHeap, moving, idx)
        : compare < 0
          ? siftDown(comparator, newHeap, moving, idx)
          : [[idx, moving]]
    }
  } else {
    const safeIdx = !idx ? 0 : idx
    const last = newHeap.pop()
    if (!newHeap.length) return []
    if (safeIdx !== heap.length - 1) {
      newHeap[safeIdx] = last
      heapUpdateIdxs = siftDown(comparator, newHeap, last, safeIdx)
    }
  }

  return heapUpdateIdxs.reduce(
    (modHeap, update) => {
      modHeap[update[0]] = update[1]
      return modHeap
    }, newHeap)
}

function siftUp(comparator, heap, moving, movingIdx, updateIdxs) {
  if (movingIdx < 0) return updateIdxs

  const parentIdx = parentIndex(movingIdx)
  const parent = heap[parentIdx]

  const hasHeapProp = parentIdx > -1 && parentIdx < movingIdx && parent
    ? comparator(parent[0], moving[0]) < 1
    : true

  if (!hasHeapProp) {
    return siftUp(
      comparator,
      heap,
      moving,
      parentIdx,
      (updateIdxs || [])
        .concat([[movingIdx, parent]]))
  }
  return (updateIdxs || [])
    .concat([[movingIdx, moving]])
}

function siftDown(comparator, heap, moving, movingIdx, updateIdxs) {
  if (movingIdx > heap.length) return updateIdxs

  const range = childRange(movingIdx)
  let prevBest
  for(let ii = range[0]; ii <= range[1]; ii++) {
    prevBest = heap[ii] !== undefined
        && comparator(moving[0], heap[ii][0]) > 0
        && (prevBest === undefined
          || comparator(heap[prevBest][0], heap[ii][0]) > 0)
      ? ii
      : prevBest
  }

  if (prevBest !== undefined) {
    return siftDown(
      comparator,
      heap,
      moving,
      prevBest,
      (updateIdxs || [])
        .concat([[movingIdx, heap[prevBest]]]))
  }
  return (updateIdxs || [])
    .concat([[movingIdx, moving]])
}

function parentIndex(childIdx) {
  return Math.floor((childIdx - 1) / N_CHILDREN)
}

function childRange(parentIdx) {
  if (parentIdx < 0 || parentIdx === undefined || parentIdx === null) {
    return [0, 0]
  }
  const baseIdx = parentIdx*N_CHILDREN
  return [baseIdx + 1, baseIdx + N_CHILDREN]
}

// from Operations
function defaultComparator(a, b) {
  if (a === undefined && b === undefined) {
    return 0;
  }

  if (a === undefined) {
    return 1;
  }

  if (b === undefined) {
    return -1;
  }

  return a > b ? 1 : a < b ? -1 : 0;
}

export const N_CHILDREN = 2
