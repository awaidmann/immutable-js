///<reference path='../resources/jest.d.ts'/>

import { PriorityQueue } from '../';

describe('PriorityQueue', () => {
  it('constructor provides empty priority queue', () => {
    const pq = PriorityQueue();
    expect(pq.size).toBe(0);
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
    let pq = PriorityQueue()
      .set('a', 0, 'A')
      .set('b', 1, 'B')
      .set('c', 2, 'C');

    expect(pq.size).toBe(3);
    expect(pq.first()).toEqual('A');

    pq = pq.delete('a');
    expect(pq.size).toBe(2);
    expect(pq.first()).toEqual('B');

    pq = pq.delete('b');
    expect(pq.size).toBe(1);
    expect(pq.first()).toEqual('C');

    pq = pq.delete('c');
    expect(pq.size).toBe(0);
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
});
