import { DELETE } from './TrieUtils';

import { KeyedCollection } from './Collection';
import { defaultComparator } from './Operations';

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
