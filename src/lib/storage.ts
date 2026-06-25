import { openDB, type DBSchema } from "idb";
import type { CouncilSession, FallbackPolicy, Language, ModelConnection } from "../types";

type StoredSettings = {
  id: "settings";
  language: Language;
  connections: ModelConnection[];
  fallbackPolicy?: FallbackPolicy;
};

interface AiCouncilDb extends DBSchema {
  settings: {
    key: string;
    value: StoredSettings;
  };
  sessions: {
    key: string;
    value: CouncilSession;
    indexes: {
      "by-updated": string;
    };
  };
}

const dbPromise = openDB<AiCouncilDb>("ai-council", 1, {
  upgrade(db) {
    db.createObjectStore("settings", { keyPath: "id" });
    const sessions = db.createObjectStore("sessions", { keyPath: "id" });
    sessions.createIndex("by-updated", "updatedAt");
  },
});

function sanitizeConnections(connections: ModelConnection[]) {
  return connections.map((connection) => {
    if (connection.secretStorage === "local") {
      return connection;
    }

    const safeConnection = { ...connection };
    delete safeConnection.apiKey;
    delete safeConnection.customHeaders;
    return safeConnection;
  });
}

export async function loadSettings() {
  const db = await dbPromise;
  return db.get("settings", "settings");
}

export async function saveSettings(settings: StoredSettings) {
  const db = await dbPromise;
  await db.put("settings", {
    ...settings,
    connections: sanitizeConnections(settings.connections),
  });
}

export async function saveSession(session: CouncilSession) {
  const db = await dbPromise;
  await db.put("sessions", session);
}

export async function deleteSession(sessionId: string) {
  const db = await dbPromise;
  await db.delete("sessions", sessionId);
}

export async function loadSessions() {
  const db = await dbPromise;
  const sessions = await db.getAllFromIndex("sessions", "by-updated");
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function clearSessions() {
  const db = await dbPromise;
  await db.clear("sessions");
}

export async function clearAllLocalData() {
  const db = await dbPromise;
  await Promise.all([db.clear("settings"), db.clear("sessions")]);
  window.localStorage.removeItem("ai-council-language");
}
