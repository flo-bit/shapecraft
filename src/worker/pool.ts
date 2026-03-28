import { Mesh } from '../mesh'

export interface WorkerPoolOptions {
  maxWorkers?: number
}

export class WorkerPool {
  constructor(_options?: WorkerPoolOptions) {}

  async run<T>(fn: (...args: any[]) => Mesh, ...args: any[]): Promise<Mesh> {
    return fn(...args)
  }

  async batch(tasks: Array<[(...args: any[]) => Mesh, ...any[]]>): Promise<Mesh[]> {
    return tasks.map(([fn, ...args]) => fn(...args))
  }

  dispose(): void {}
}
