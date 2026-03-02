// Stub module: replaces 'electron' in the web build.
// Nothing in the renderer directly imports from 'electron',
// but some transitive imports might. This prevents build failures.
export const app = {};
export const ipcRenderer = {};
export const shell = {};
export default {};
