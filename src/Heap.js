import { is } from './is';
import { fromJS } from './fromJS';
import { Collection, KeyedCollection } from './Collection';
import { isCollection, isOrdered } from './Predicates';
import {
  DELETE,
  SHIFT,
  SIZE,
  MASK,
  NOT_SET,
  CHANGE_LENGTH,
  DID_ALTER,
  OwnerID,
  MakeRef,
  SetRef,
  arrCopy
} from './TrieUtils';
import { emptyList } from './List';
import { MapPrototype } from './Map';
import { hash } from './Hash';
import { Iterator, iteratorValue, iteratorDone } from './Iterator';
import { sortFactory } from './Operations';
import coerceKeyPath from './utils/coerceKeyPath';
import assertNotInfinite from './utils/assertNotInfinite';
import quoteString from './utils/quoteString';

export class Heap extends KeyedCollection {
  // @pragma Construction
  constructor(value) {
    return value === null || value === undefined
      ? emptyHeap()
      : isHeap(value)
        ? value
        : emptyHeap().withMutations(heap => {
            const iter = KeyedCollection(value);
            assertNotInfinite(iter.size)
            iter.forEach((pv, k) => heap.set(k, pv))
          })
  }

  static of(/*...heapTuples*/) {
    return this(arguments);
  }

  toString() {
    return this.__toString('Heap {', '}');
  }

  // @pragma Access

  get(k, notSetValue) {
    return this._root ? this._root.get(hash(k), k, notSetValue) : notSetValue;
  }

  // @pragma Modification

  set(k, pvEntry) {
    return updateHeap(this, k, pvEntry);
  }

  remove(k) {
    return updateHeap(this, k, NOT_SET);
  }

  update(k, notSetValue, pvEntry) {

  }

  // @pragma Iteration

  __iterator(type, reverse) {
    return new HeapIterator(this, type, reverse);
  }

  __iterate(fn, reverse) {
    let iterations = 0;
    this._root && this._root.iterate(
      kpvEntry => {
        iterations++;
        return fn(kpvEntry[1], kpvEntry[0], this);
      },
      reverse
    );
    return iterations;
  }

  __ensureOwner(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      if (this.size === 0) {
        return emptyHeap()
      }
      this.__ownerID = ownerID;
      this.__altered = false;
      return this;
    }
    return makeHeap(this.size, this._root, ownerID, this._hash);
  }
}

export function isHeap(maybeHeap) {
  return !!(maybeHeap && maybeHeap[IS_HEAP_SENTINEL]);
}

Heap.isHeap = isHeap;

const IS_HEAP_SENTINEL = '@@__IMMUTABLE_HEAP__@@';
const ROOT_PARENT = {};

export const HeapPrototype = Heap.prototype;
HeapPrototype[IS_HEAP_SENTINEL] = true;
HeapPrototype[DELETE] = HeapPrototype.remove;
HeapPrototype.setIn = MapPrototype.setIn;
HeapPrototype.deleteIn = (HeapPrototype.removeIn = MapPrototype.removeIn);
HeapPrototype.updateIn = MapPrototype.updateIn;
HeapPrototype.mergeIn = MapPrototype.mergeIn;
HeapPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
HeapPrototype.withMutations = MapPrototype.withMutations;
HeapPrototype.asMutable = MapPrototype.asMutable;
HeapPrototype.asImmutable = MapPrototype.asImmutable;
HeapPrototype.wasAltered = MapPrototype.wasAltered;

function makeHeap(size, root, ownerID, hash) {
  console.log('makeHeap');
  console.log(size);
  console.log(root);

  const heap = Object.create(HeapPrototype);
  heap.size = size || 0;
  heap._root = root;
  heap.__ownerID = ownerID;
  heap.__hash = hash;
  heap.__altered = false;
  return heap;
}

let EMPTY_HEAP;
function emptyHeap() {
  return EMPTY_HEAP || (EMPTY_HEAP = makeHeap());
}

function updateHeap(heap, key, pvEntry) {
  const didChangeSize = MakeRef(CHANGE_LENGTH);
  const didAlter = MakeRef(DID_ALTER);
  const newRoot = updateNode(
    heap._root,
    heap.__ownerID,
    hash(key),
    key,
    pvEntry,
    didChangeSize,
    didAlter
  );

  if (!didAlter.value) {
    return heap;
  }
  const newSize = heap.size + (didChangeSize.value ? pvEntry === NOT_SET ? -1 : 1 : 0);

  if (heap.__ownerID) {
    heap.size = newSize;
    heap._root = newRoot;
    heap.__hash = undefined;
    heap.__altered = true;
    return heap;
  }
  return newRoot ? makeHeap(newSize, newRoot) : emptyHeap();
}

function updateNode(
  node,
  ownerID,
  keyHash,
  key,
  pvEntry,
  didChangeSize,
  didAlter
) {
  if (!pvEntry) {
    return;
  }

  if (!node) {
    if (pvEntry === NOT_SET) {
      return node;
    }
    SetRef(didAlter);
    SetRef(didChangeSize);
    return new ValueNode(ownerID, keyHash, key, pvEntry[0], pvEntry[1]);
  }
  return node.update(
    ownerID,
    0,
    keyHash,
    key,
    pvEntry,
    didChangeSize,
    didAlter
  );
}

class HashBucketNode {
  constructor(ownerID, depth, rootOrSubqueue, hashRedirect) {
    this.ownerID = ownerID;
    this.depth = depth;

    if (rootOrSubqueue && !hashRedirect) {
      this.priority = rootOrSubqueue.priority;
      this.value = rootOrSubqueue.value;

      this._subqueue = [rootOrSubqueue];
      this._hashRedirect = [];
      this._hashRedirect[depthHash(depth, rootOrSubqueue.keyHash)] = 0;
    } else {
      this._subqueue = rootOrSubqueue || [];
      this._hashRedirect = hashRedirect || [];

      const rootNode = this._subqueue[0];
      this.priority = rootNode ? rootNode.priority : Number.MAX_SAFE_INTEGER;
      this.value = rootNode ? rootNode.value : undefined;
    }
  }

  get(keyHash, key, notSetValue) {
    const ptrRedirect = this._hashRedirect[depthHash(this.depth, keyHash)];
    return this._subqueue[ptrRedirect]
      ? this._subqueue[ptrRedirect].get(keyHash, key, notSetValue)
      : notSetValue;
  }

  update(
    ownerID,
    depth,
    keyHash,
    key,
    pvEntry,
    didChangeSize,
    didAlter
  ) {
    const removed = value === NOT_SET;
    const priority = pvEntry[0];
    const value = pvEntry[1];
    const isMutable = ownerID && ownerID === this.ownerID;
    if (keyHash === undefined) {
      keyHash = hash(key);
    }

    const ptrRedirect = this._hashRedirect[depthHash(this.depth, keyHash)];
    const prevSubNode = this._subqueue[ptrRedirect];
    let newSubNode;
    if (prevSubNode) {
      newSubNode = prevSubNode.update(
        ownerID,
        depth + 1,
        keyHash,
        key,
        pvEntry,
        didChangeSize,
        didAlter
      );
    } else {
      SetRef(didChangeSize);
      newSubNode = !removed
        ? new ValueNode(ownerID, keyHash, key, priority, value)
        : undefined;
    }

    let results = removeFromSubqueue(
      isMutable ? this._subqueue : this._subqueue.slice(),
      isMutable ? this._hashRedirect : this._hashRedirect.slice(),
      ptrRedirect,
      depth
    );

    if (prevSubNode !== newSubNode) {
      SetRef(didAlter);

      results = insertIntoSubqueue(results[0], results[1], newSubNode, depth);
      if (isMutable) {
        this.value = newSubNode ? newSubNode.value : undefined;
        this.priority = newSubNode ? newSubNode.priority : undefined;
      } else {
        return new HashBucketNode(
          ownerID,
          depth,
          results[0],
          results[1]
        );
      }
    }

    return this;
  }

  iterate(fn, reverse) {
    // preorder traversal
  }

  next(prevKey, nextKey, prevPriority, nextPriority) {

  }
}

class ValueNode {
  constructor(ownerID, keyHash, key, priority, value) {
    this.ownerID = ownerID;
    this.keyHash = keyHash;
    this.key = key;
    this.priority = priority;
    this.value = value;
  }

  copy() {
    return new ValueNode(
      this.ownerID,
      this.keyHash,
      this.key,
      this.priority,
      this.value
    );
  }

  get(keyHash, key, notSetValue) {
    return is(key, this.key) ? this.value : notSetValue;
  }

  update(
    ownerID,
    depth,
    keyHash,
    key,
    pvEntry,
    didChangeSize,
    didAlter
  ) {
    const removed = pvEntry === NOT_SET;

    const priority = pvEntry[0];
    const value = pvEntry[1];

    const keyMatch = is(key, this.key);
    const isMutable = ownerID && ownerID === this.ownerID;
    if (keyHash === undefined) {
      keyHash = hash(key);
    }

    if (keyMatch && priority === this.priority && value === this.value) {
      return this;
    }

    SetRef(didAlter);

    if (removed) {
      SetRef(didChangeSize);
      return; // undefined
    }

    if (keyMatch) {
      if (isMutable) {
        this.value = value;
        this.priority = priority;
        return this;
      }
      return new ValueNode(ownerID, keyHash, key, priority, value);
    } else {
      SetRef(didChangeSize);
      return (new HashBucketNode(
        ownerID,
        depth,
        isMutable ? this : this.copy()
      ))
      .update(ownerID, depth, keyHash, key, pvEntry, didChangeSize, didAlter);
    }
  }
}

function depthHash(depth, keyHash) {
  return (keyHash + depth) % SIZE;
}

function insertIntoSubqueue(subqueue, hashRedirect, insertNode, depth) {
  if (insertNode) {
    subqueue.push(insertNode);
    hashRedirect[depthHash(depth, insertNode.keyHash)] = subqueue.length - 1;

    let hasHeapProp = false;
    let movingIndex = subqueue.length - 1;

    let parentIndex;
    let movingNode;
    let parentNode;
    while(!hasHeapProp && movingIndex >= 0) {
      parentIndex = Math.floor((movingIndex - 1)/2);
      movingNode = subqueue[movingIndex];
      parentNode = subqueue[parentIndex];

      hasHeapProp = parentIndex >= 0
          && parentIndex < movingIndex
          && movingNode
          && parentNode
        ? parentNode.priority <= movingNode.priority
        : true;

      if (!hasHeapProp) {
        subqueue[movingIndex] = parentNode;
        subqueue[parentIndex] = movingNode;

        hashRedirect[depthHash(depth, movingNode.keyHash)] = parentIndex;
        hashRedirect[depthHash(depth, parentNode.keyHash)] = movingIndex;

        movingIndex = parentIndex;
      }
    }
  }

  return [subqueue, hashRedirect];
}

function removeFromSubqueue(subqueue, hashRedirect, removeIndex, depth) {
  if (removeIndex >= 0 && removeIndex < subqueue.length) {
    hashRedirect[depthHash(depth, subqueue[removeIndex].keyHash)] = undefined;
    hashRedirect[depthHash(depth, subqueue[subqueue.length-1].keyHash)] = removeIndex;

    subqueue[removeIndex] = subqueue[subqueue.length - 1];
    subqueue.splice(subqueue.length - 1, 1);

    let hasHeapProp = false;
    let movingIndex = removeIndex;

    let movingNode;
    let leftIndex;
    let rightIndex;
    let minIndex;
    while(!hasHeapProp && movingIndex < subqueue.length) {
      movingNode = subqueue[movingIndex];
      leftIndex = movingIndex*2 + 1;
      rightIndex = movingIndex*2 + 2;

      minIndex = subqueue[leftIndex]
        ? subqueue[rightIndex]
            && subqueue[rightIndex].priority < subqueue[leftIndex].priority
          ? rightIndex
          : leftIndex
        : -1;

      hasHeapProp = minIndex == -1
        || movingNode.priority <= subqueue[minIndex].priority;

      if (!hasHeapProp) {
        hashRedirect[depthHash(depth, movingNode.keyHash)] = minIndex;
        hashRedirect[depthHash(depth, subqueue[minIndex].keyHash)] = movingIndex;

        subqueue[movingIndex] = subqueue[minIndex];
        subqueue[minIndex] = movingNode;

        movingIndex = minIndex;
      }
    }
  }

  return [subqueue, hashRedirect];
}


class HeapIterator extends Iterator {
  constructor(heap, type, reverse) {
    this._type = type;
    this._reverse = reverse;
  }

  next() {
    const type = this._type;
  }
}

function heapIteratorValue(type) {
  return iteratorValue(type)
}
