///<reference path='../resources/jest.d.ts'/>

import { PriorityQueue } from '../';

describe('PriorityQueue', () => {
  it('constructor provides empty priority queue', () => {
    const pq = PriorityQueue();
    expect(pq.size).toBe(0);
  });

  it('constructor provides initial values', () => {
    const pq = PriorityQueue({ a: [0, 'A'], b: [1, 'B'], c: [2, 'C'] });

    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('A');
    expect(pq.get('a')).toEqual([0, 'A']);
    expect(pq.get('b')).toEqual([1, 'B']);
    expect(pq.get('c')).toEqual([2, 'C']);
  });

  it('constructor provides initial values with non-numeric priorities', () => {
    const pq = PriorityQueue({
      a: ['_a', 'A'],
      b: ['_b', 'B'],
      c: ['_c', 'C'],
    });

    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('A');
    expect(pq.get('a')).toEqual(['_a', 'A']);
    expect(pq.get('b')).toEqual(['_b', 'B']);
    expect(pq.get('c')).toEqual(['_c', 'C']);
  });

  it('constructor is identity when provided priority queue', () => {
    const pq1 = PriorityQueue({ a: [0, 'A'], b: [1, 'B'], c: [2, 'C'] });
    const pq2 = PriorityQueue(pq1);
    expect(pq2).toBe(pq1);
  });

  it('gets [priority, value] entry by key', () => {
    const pq = PriorityQueue()
      .set('a', 0, 'A')
      .set('b', 1, 'B')
      .set('c', 2, 'C');

    expect(pq.size).toBe(3);
    expect(pq.get('a')).toEqual([0, 'A']);
    expect(pq.get('b')).toEqual([1, 'B']);
    expect(pq.get('c')).toEqual([2, 'C']);
  });

  it('maintains priority property under sets', () => {
    let pq = PriorityQueue().set('b', 1, 'B');

    expect(pq.size).toBe(1);
    expect(pq.first()).toEqual('B');

    pq = pq.set('a', 0, 'A');
    expect(pq.size).toBe(2);
    expect(pq.first()).toEqual('A');

    pq = pq.set('c', 2, 'C');
    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('A');
  });

  it('maintains priority property under updates', () => {
    let pq = PriorityQueue()
      .set('a', 0, 'A')
      .set('b', 1, 'B')
      .set('c', 2, 'C');

    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('A');

    pq = pq.set('a', 3, 'A');
    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('B');

    pq = pq.set('c', 0, 'C');
    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('C');
  });

  it('maintains priority property under deletes', () => {
    const notSet = {};
    let pq = PriorityQueue()
      .set('a', 0, 'A')
      .set('b', 1, 'B')
      .set('c', 2, 'C');

    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('A');

    pq = pq.delete('a');
    expect(pq.size).toBe(2);
    expect(pq.first()).toEqual('B');
    expect(pq.get('a', notSet)).toEqual(notSet);

    pq = pq.delete('c');
    expect(pq.size).toBe(1);
    expect(pq.first()).toEqual('B');
    expect(pq.get('c', notSet)).toEqual(notSet);
  });

  it('maintains priority property under pop', () => {
    let pq = PriorityQueue()
      .set('a', 0, 'A')
      .set('b', 1, 'B')
      .set('c', 2, 'C');

    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('A');

    pq = pq.pop();
    expect(pq.size).toBe(2);
    expect(pq.first()).toEqual('B');

    pq = pq.pop();
    expect(pq.size).toBe(1);
    expect(pq.first()).toEqual('C');

    pq = pq.pop();
    expect(pq.size).toBe(0);
  });

  it('allows chained mutations', () => {
    const pq1 = PriorityQueue();
    const pq2 = pq1.withMutations(pq => pq.set('b', 1, 'B').set('a', 0, 'A'));

    expect(pq1.size).toBe(0);
    expect(pq2.size).toBe(2);
    expect(pq2.first()).toEqual('A');
    expect(pq2.get('a')).toEqual([0, 'A']);
    expect(pq2.get('b')).toEqual([1, 'B']);
  });
});
