import {
  createWikiStoreInstance,
  type Backlink,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type MaintenanceReport,
  type PatchOperation,
  type WikiEntry,
  type WikiMeta,
} from "@agent-wiki/wiki";

export type { Backlink, GraphData, GraphLink, GraphNode, MaintenanceReport, PatchOperation, WikiEntry, WikiMeta };
export {
  createEntrySchema,
  errorStatus,
  getPublicErrorMessage,
  isWikiError,
  patchEntrySchema,
  slugSchema,
  updateEntrySchema,
  validateSlug,
} from "@agent-wiki/wiki";

export const WIKI_DIR = process.env.WIKI_DIR;

let storeInstance: ReturnType<typeof createWikiStoreInstance> | null = null;

function getStore() {
  if (!storeInstance) {
    storeInstance = createWikiStoreInstance(WIKI_DIR);
  }
  return storeInstance;
}

export function resetStore() {
  storeInstance = null;
}

export const listEntries = () => getStore().listEntries();
export const getEntry = (slug: string) => getStore().getEntry(slug);
export const createEntry = (slug: string, title: string, content: string, tags?: string[]) => getStore().createEntry(slug, title, content, tags);
export const updateEntry = (slug: string, content: string, meta?: { title?: string; tags?: string[] }) => getStore().updateEntry(slug, content, meta);
export const patchEntry = (slug: string, operation: PatchOperation, params: { content?: string; search?: string; replacement?: string; anchor?: string }) => getStore().patchEntry(slug, operation, params);
export const deleteEntry = (slug: string) => getStore().deleteEntry(slug);
export const searchEntries = (query: string) => getStore().searchEntries(query);
export const getGraphData = () => getStore().getGraphData();
export const getBacklinks = (slug: string) => getStore().getBacklinks(slug);
export const getMaintenanceReport = () => getStore().getMaintenanceReport();
export const listHistory = (slug: string) => getStore().listHistory(slug);
