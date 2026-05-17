/** Binary min-heap. Order is defined by the `key` function (smaller = higher priority). */
export class MinHeap<T> {
  private data: T[] = [];
  constructor(private readonly key: (item: T) => number) {}

  get size(): number {
    return this.data.length;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  push(item: T): void {
    this.data.push(item);
    this.siftUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop() as T;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    const k = this.key;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (k(this.data[i] as T) < k(this.data[parent] as T)) {
        [this.data[i], this.data[parent]] = [this.data[parent] as T, this.data[i] as T];
        i = parent;
      } else break;
    }
  }

  private siftDown(i: number): void {
    const k = this.key;
    const n = this.data.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && k(this.data[l] as T) < k(this.data[smallest] as T)) smallest = l;
      if (r < n && k(this.data[r] as T) < k(this.data[smallest] as T)) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest] as T, this.data[i] as T];
      i = smallest;
    }
  }
}
