import {
  DELETE,
  MASK,
  NOT_SET,
  CHANGE_LENGTH,
  MakeRef,
  SetRef,
} from './TrieUtils';

import { KeyedCollection } from './Collection';
import { defaultComparator } from './Operations';

import { hash } from './Hash';
import { setIn } from './methods/setIn';
import { deleteIn } from './methods/deleteIn';
import { update } from './methods/update';
import { updateIn } from './methods/updateIn';
import { merge, mergeWith } from './methods/merge';
import { mergeDeep, mergeDeepWith } from './methods/mergeDeep';
import { mergeIn } from './methods/mergeIn';
import { mergeDeepIn } from './methods/mergeDeepIn';
import { withMutations } from './methods/withMutations';
import { asImmutable } from './methods/asImmutable';
import { wasAltered } from './methods/wasAltered';

export class PriorityQueue extends KeyedCollection {
  constructor(value, comparator) {
    return value === null || value === undefined
      ? emptyPriorityQueue(comparator)
      : isPriorityQueue(value)
        ? value
        : emptyPriorityQueue(comparator);
  }

  get(k, notSetValue) {
    return this._root
      ? this._root.get(0, undefined, k, notSetValue)
      : notSetValue;
  }

  first(notSetValue) {
    return this._root ? this._root.first(0) : notSetValue;
  }

  set(k, p, v) {
    return updatePriorityQueue(this, k, p, v);
  }
  remove(k) {
    return this.set(k, undefined, NOT_SET);
  }
}

export function isPriorityQueue(maybePriorityQueue) {
  return !!(
    maybePriorityQueue && maybePriorityQueue[IS_PRIORITY_QUEUE_SENTINEL]
  );
}

PriorityQueue.isPriorityQueue = isPriorityQueue;

const IS_PRIORITY_QUEUE_SENTINEL = '@@__IMMUTABLE_PRIORITY_QUEUE__@@';

export const PQPrototype = PriorityQueue.prototype;
PQPrototype[IS_PRIORITY_QUEUE_SENTINEL] = true;
PQPrototype[DELETE] = PQPrototype.remove;
PQPrototype.removeAll = PQPrototype.deleteAll;
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

function makePriorityQueue(size, comparator, root, ownerID, hash) {
  const pq = Object.create(PriorityQueue.prototype);
  pq.size = size;
  pq._comparator = comparator;
  pq._root = root;
  pq.__ownerID = ownerID;
  pq.__hash = hash;
  return pq;
}

let EMPTY_PRIORITY_QUEUE;
export function emptyPriorityQueue(comparator) {
  return (
    EMPTY_PRIORITY_QUEUE ||
    (EMPTY_PRIORITY_QUEUE = makePriorityQueue(
      0,
      comparator || defaultComparator
    ))
  );
}

function updatePriorityQueue(pq, k, p, v) {
  let newRoot;
  let newSize;
  if (!pq._root) {
    if (v === NOT_SET) {
      return pq;
    }
    newSize = 1;
    newRoot = new KeyedHeapNode(pq.__ownerID, [], []).update(
      pq.__ownerID,
      pq._comparator,
      0,
      undefined,
      k,
      p,
      v
    );
  } else {
    const didChangeSize = MakeRef(CHANGE_LENGTH);
    newRoot = pq._root.update(
      pq.__ownerID,
      pq._comparator,
      0,
      undefined,
      k,
      p,
      v,
      didChangeSize
    );
    newSize = pq.size + (didChangeSize.value ? (v === NOT_SET ? -1 : 1) : 0);
  }

  return newRoot
    ? makePriorityQueue(newSize, pq._comparator, newRoot)
    : emptyPriorityQueue();
}

class KeyedHeapNode {
  constructor(ownerID, kpvMap, pkHeap) {
    this.ownerID = ownerID;
    this.kpvMap = kpvMap;
    this.pkHeap = pkHeap;
  }

  get(shift, keyHash, key, notSetValue) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const idx = idxForShiftedKeyHash(shift)(keyHash);
    return this.kpvMap[idx] || notSetValue;
  }

  first(shift, notSetValue) {
    if (!this.pkHeap.length) return;

    const idx = idxForShiftedKeyHash(shift)(this.pkHeap[0][1]);
    return this.kpvMap[idx] ? this.kpvMap[idx][1] || notSetValue : notSetValue;
  }

  update(
    ownerID,
    comparator,
    shift,
    keyHash,
    key,
    priority,
    value,
    didChangeSize
  ) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }

    const idx = idxForShiftedKeyHash(shift)(keyHash);
    const removed = value === NOT_SET;
    const pvEntry = this.kpvMap[idx];

    if (removed && !pvEntry) {
      return this;
    }

    (removed || !pvEntry) && SetRef(didChangeSize);

    const updateEntries = heapUpdateEntries(
      comparator,
      this.pkHeap,
      keyHash,
      key,
      priority,
      pvEntry ? pvEntry[0] : undefined
    );

    return new KeyedHeapNode(
      ownerID,
      updateMapFromEntries(
        this.kpvMap.slice(),
        updateEntries,
        idxForShiftedKeyHash(shift),
        idx,
        value
      ),
      updateHeapFromEntries(this.pkHeap.slice(), updateEntries)
    );
  }
}

// Keyhash utils

function idxForShiftedKeyHash(shift) {
  return keyHash => (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
}

// Heap management

function updateMapFromEntries(
  map,
  updateEntries,
  idxForKeyHash,
  keyHashIdx,
  value
) {
  return updateEntries
    ? updateEntries.reduce((modMap, update) => {
        const keyHash = update[1][1];
        const idx = idxForKeyHash(keyHash);
        modMap[idx] = [update[0], idx === keyHashIdx ? value : modMap[idx][1]];
        return modMap;
      }, map)
    : map;
}

function updateHeapFromEntries(heap, updateEntries) {
  return updateEntries
    ? updateEntries.reduce((modHeap, update) => {
        modHeap[update[0]] = update[1];
        return modHeap;
      }, heap)
    : heap;
}

function heapUpdateEntries(comparator, heap, keyHash, key, priority, idx) {
  if (idx < 0 || idx >= heap.length) return heap;

  let heapUpdateIdxs = [];

  if (
    !(priority === undefined || priority === null) &&
    !(keyHash === undefined || keyHash === null)
  ) {
    const moving = [priority, keyHash, key];
    if (idx === undefined || idx === null) {
      heapUpdateIdxs = siftUp(comparator, heap, moving, heap.length);
    } else {
      const compare = comparator(heap[idx][0], priority);
      heapUpdateIdxs =
        compare > 0
          ? siftUp(comparator, heap, moving, idx)
          : compare < 0
            ? siftDown(comparator, heap, moving, idx)
            : [[idx, moving]];
    }
  } else {
    if (heap.length <= 1) {
      return [];
    }
    const safeIdx = !idx ? 0 : idx;
    if (safeIdx !== heap.length - 1) {
      const last = heap[heap.length - 1];
      const newHeap = heap.slice();
      newHeap[safeIdx] = last;
      heapUpdateIdxs = siftDown(comparator, newHeap, last, safeIdx);
    }
  }

  return heapUpdateIdxs;
}

function siftUp(comparator, heap, moving, movingIdx, updateIdxs) {
  if (movingIdx < 0) return updateIdxs;

  const parentIdx = parentIndex(movingIdx);
  const parent = heap[parentIdx];

  const hasHeapProp =
    parentIdx > -1 && parentIdx < movingIdx && parent
      ? comparator(parent[0], moving[0]) < 1
      : true;

  if (!hasHeapProp) {
    return siftUp(
      comparator,
      heap,
      moving,
      parentIdx,
      (updateIdxs || []).concat([[movingIdx, parent]])
    );
  }
  return (updateIdxs || []).concat([[movingIdx, moving]]);
}

function siftDown(comparator, heap, moving, movingIdx, updateIdxs) {
  if (movingIdx > heap.length) return updateIdxs;

  const range = childRange(movingIdx);
  let prevBest;
  for (let ii = range[0]; ii <= range[1]; ii++) {
    prevBest =
      heap[ii] !== undefined &&
      comparator(moving[0], heap[ii][0]) > 0 &&
      (prevBest === undefined || comparator(heap[prevBest][0], heap[ii][0]) > 0)
        ? ii
        : prevBest;
  }

  if (prevBest !== undefined) {
    return siftDown(
      comparator,
      heap,
      moving,
      prevBest,
      (updateIdxs || []).concat([[movingIdx, heap[prevBest]]])
    );
  }
  return (updateIdxs || []).concat([[movingIdx, moving]]);
}

function parentIndex(childIdx) {
  return Math.floor((childIdx - 1) / N_CHILDREN);
}

function childRange(parentIdx) {
  if (parentIdx < 0 || parentIdx === undefined || parentIdx === null) {
    return [0, 0];
  }
  const baseIdx = parentIdx * N_CHILDREN;
  return [baseIdx + 1, baseIdx + N_CHILDREN];
}

const N_CHILDREN = 2;
