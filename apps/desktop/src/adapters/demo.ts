import { emptyWorkspace, type Space } from "../domain";
import { demoWorkspace } from "../fixtures/demo";
import type { WorkspacePort } from "../ports";
export class SessionWorkspaceAdapter implements WorkspacePort {
  async load(space: Space) {
    return space === "demo" ? demoWorkspace() : emptyWorkspace();
  }
}
