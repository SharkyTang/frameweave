import type {
  Capability,
  Result,
  ShellInfo,
  Space,
  Workspace,
} from "../domain";
export interface WorkspacePort {
  load(space: Space): Promise<Workspace>;
}
export interface CapabilityPort {
  capability: Capability;
  request(): Promise<Result<never>>;
}
export interface ShellPort {
  info(): Promise<ShellInfo>;
  rememberRoute(route: string): Promise<void>;
  onAction(handler: (action: string) => void): Promise<() => void>;
  quit(): Promise<void>;
}
