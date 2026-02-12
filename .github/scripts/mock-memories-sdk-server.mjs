#!/usr/bin/env node
import { createServer } from "node:http";

const port = Number(process.env.MOCK_MEMORIES_PORT || 5010);
const requiredApiKey = (process.env.MOCK_MEMORIES_API_KEY || "mem_ci_test").trim();

/** @type {Array<{id:string, content:string, type:string, layer:string, scope:string, projectId:string|null, tags:string[]}>} */
const memories = [];
let memorySeq = 1;

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function envelope(data, error = null) {
  return {
    ok: error == null,
    data: error == null ? data : null,
    error,
    meta: {
      mock: true,
      timestamp: new Date().toISOString(),
    },
  };
}

function makeError(code, message, status = 400) {
  return {
    type: status === 401 ? "auth_error" : "validation_error",
    code,
    message,
    status,
    retryable: false,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function isAuthorized(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return false;
  return auth.slice("Bearer ".length).trim() === requiredApiKey;
}

function normalizeMemory(input) {
  const type =
    typeof input.type === "string" && ["rule", "decision", "fact", "note", "skill"].includes(input.type)
      ? input.type
      : "note";
  const scopeObj = input.scope && typeof input.scope === "object" ? input.scope : {};
  const projectId = typeof scopeObj.projectId === "string" && scopeObj.projectId.trim().length > 0
    ? scopeObj.projectId.trim()
    : null;

  return {
    id: `mock_${memorySeq++}`,
    content: typeof input.content === "string" ? input.content.trim() : "",
    type,
    layer: type === "rule" ? "rule" : "long_term",
    scope: projectId ? "project" : "global",
    projectId,
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag) => typeof tag === "string" && tag.trim().length > 0)
      : [],
  };
}

function searchMemories(query, limit = 8) {
  const normalized = String(query || "").toLowerCase().trim();
  if (!normalized) return memories.slice(0, limit);
  return memories
    .filter((memory) => memory.content.toLowerCase().includes(normalized))
    .slice(0, limit);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true, service: "mock-memories-sdk" });
    return;
  }

  if (!isAuthorized(req)) {
    json(res, 401, envelope(null, makeError("AUTH_INVALID", "Missing or invalid bearer token", 401)));
    return;
  }

  try {
    if (req.method === "POST" && url.pathname === "/api/sdk/v1/memories/add") {
      const body = await readBody(req);
      const normalized = normalizeMemory(body);
      if (!normalized.content) {
        json(res, 400, envelope(null, makeError("MISSING_CONTENT", "content is required", 400)));
        return;
      }
      memories.push(normalized);
      json(
        res,
        200,
        envelope({
          message: `Memory stored (${normalized.id})`,
          memoryId: normalized.id,
        }),
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sdk/v1/memories/search") {
      const body = await readBody(req);
      const limit = Number.isFinite(Number(body.limit))
        ? Math.max(1, Math.min(50, Math.floor(Number(body.limit))))
        : 8;
      const matches = searchMemories(body.query, limit);
      json(res, 200, envelope({ memories: matches }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sdk/v1/context/get") {
      const body = await readBody(req);
      const limit = Number.isFinite(Number(body.limit))
        ? Math.max(1, Math.min(50, Math.floor(Number(body.limit))))
        : 8;
      const candidates = searchMemories(body.query, limit);
      const rules = candidates.filter((memory) => memory.type === "rule");
      const nonRules = candidates.filter((memory) => memory.type !== "rule");
      json(
        res,
        200,
        envelope({
          rules,
          memories: nonRules,
          trace: {
            strategy: "baseline",
            graphDepth: 0,
            graphLimit: 0,
            baselineCandidates: candidates.length,
            graphCandidates: 0,
            graphExpandedCount: 0,
            totalCandidates: candidates.length,
          },
        }),
      );
      return;
    }

    json(res, 404, envelope(null, makeError("NOT_FOUND", `Unknown route: ${url.pathname}`, 404)));
  } catch (error) {
    json(
      res,
      500,
      envelope(
        null,
        makeError(
          "MOCK_SERVER_ERROR",
          error instanceof Error ? error.message : "Unknown error",
          500,
        ),
      ),
    );
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-memories-sdk] listening on http://127.0.0.1:${port}`);
});
