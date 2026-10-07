import type {WorkspaceAppearance, WorkspaceDisplaySize} from "./workspace-profile";

export const appearanceCacheKey = "pacifica:appearance:v1";

// Runs synchronously in <head>, before the shell or its loading screen can paint.
// Only small display preferences live here; contacts remain in workspace storage.
export const appearanceBootstrap = `(function(){var root=document.documentElement,theme="dark",size="large",collapsed=false;try{var saved=JSON.parse(localStorage.getItem("${appearanceCacheKey}")||"null");if(saved&&(saved.appearance==="light"||saved.appearance==="dark"))theme=saved.appearance;if(saved&&["comfortable","large","extra-large"].indexOf(saved.displaySize)!==-1)size=saved.displaySize;}catch{}try{collapsed=localStorage.getItem("pacifica:sidebar-collapsed")==="true";}catch{}root.dataset.theme=theme;root.dataset.displaySize=size;root.dataset.sidebarCollapsed=String(collapsed);root.style.colorScheme=theme;})();`;

export function applyWorkspaceAppearance(appearance: WorkspaceAppearance, displaySize: WorkspaceDisplaySize) {
  const root = document.documentElement;
  root.dataset.theme = appearance;
  root.dataset.displaySize = displaySize;
  root.style.colorScheme = appearance;
  try {localStorage.setItem(appearanceCacheKey, JSON.stringify({appearance, displaySize}));} catch {}
}
