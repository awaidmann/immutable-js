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
});
