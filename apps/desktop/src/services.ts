import type { CreativeProject, Workspace } from "./domain";
export function updateProject(
  workspace: Workspace,
  project: CreativeProject,
): Workspace {
  return {
    ...workspace,
    projects: workspace.projects.map((p) =>
      p.id === project.id ? { ...project, revision: p.revision + 1 } : p,
    ),
  };
}
export function workspaceSearch(workspace: Workspace, query: string) {
  const q = query.trim().toLocaleLowerCase();
  const entries = [
    ...workspace.assets
      .filter((a) => !a.archived)
      .map((a) => ({
        id: a.id,
        title: a.title,
        kind: "参考素材",
        path: `/analysis/${a.id}`,
      })),
    ...workspace.projects.map((p) => ({
      id: p.id,
      title: p.title,
      kind: "创作项目",
      path: `/creator/${p.id}`,
    })),
    ...workspace.methods
      .filter((m) => !m.archived)
      .map((m) => ({
        id: m.id,
        title: m.title,
        kind: "创作方法",
        path: "/methods",
      })),
  ];
  return entries.filter((item) => item.title.toLocaleLowerCase().includes(q));
}
