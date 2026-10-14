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

export interface PersonalMediaPort extends WorkspacePort {
  info(): Promise<import("../domain").LibraryInfo>;
  getAsset(id: string): Promise<import("../domain").VideoAsset>;
  updateAsset(
    patch: import("../domain").AssetPatch,
  ): Promise<import("../domain").VideoAsset>;
  choose(): Promise<import("../domain").Selection>;
  start(token: string): Promise<import("../domain").ImportBatch>;
  batch(id?: string): Promise<import("../domain").ImportBatch | null>;
  cancel(id: string, attemptId?: string): Promise<void>;
  playback(id: string): Promise<import("../domain").PlaybackSource>;
  releasePlayback(token: string): Promise<void>;
  metadata(input: import("../domain").MediaMetadata): Promise<void>;
  playbackFailed(id: string, contentHash: string, token: string): Promise<void>;
}
