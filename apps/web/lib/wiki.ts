import path from "path";
import {
  createWikiStore,
  type Backlink,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type PatchOperation,
  type WikiEntry,
  type WikiMeta,
} from "@agent-wiki/wiki";

export type { Backlink, GraphData, GraphLink, GraphNode, PatchOperation, WikiEntry, WikiMeta };
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

export const WIKI_DIR = process.env.WIKI_DIR ?? path.join(process.cwd(), "../../wiki");

const store = createWikiStore(WIKI_DIR);

export const listEntries = store.listEntries;
export const getEntry = store.getEntry;
export const createEntry = store.createEntry;
export const updateEntry = store.updateEntry;
export const patchEntry = store.patchEntry;
export const deleteEntry = store.deleteEntry;
export const searchEntries = store.searchEntries;
export const getGraphData = store.getGraphData;
export const getBacklinks = store.getBacklinks;
export const listHistory = store.listHistory;
