export function sync<Args extends unknown[]>(
  func: (...args: Args) => Promise<void>,
): (...args: Args) => void {
  return (...args) => void func(...args).catch(console.error)
}
