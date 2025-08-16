// CE-05 Global Command Registry
import { totalRuleCount } from '../core/command';
import type { CommandDescriptor } from '../core/command';

class CommandRegistryImpl {
  private map = new Map<string, CommandDescriptor>();

  register(descriptor: CommandDescriptor): void {
    const { key } = descriptor;
    if (this.map.has(key)) throw new Error(`command already registered: ${key}`);
    if (totalRuleCount(descriptor) === 0) throw new Error(`command has zero rules: ${key}`);
    this.map.set(key, descriptor);
  }

  get(key: string): CommandDescriptor | undefined {
    return this.map.get(key);
  }
  list(): readonly CommandDescriptor[] {
    return Array.from(this.map.values());
  }
  clear(): void {
    this.map.clear();
  }
}

export const CommandRegistry = new CommandRegistryImpl();
