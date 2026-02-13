#!/usr/bin/env node

const baseUrl = process.env.STARTER_BASE_URL;
const addPath = process.env.STARTER_ADD_PATH;
const searchPath = process.env.STARTER_SEARCH_PATH;
const contextPath = process.env.STARTER_CONTEXT_PATH;
const authToken = process.env.STARTER_AUTH_TOKEN?.trim();

if (!baseUrl || !addPath || !searchPath || !contextPath) {
  console.error("Missing STARTER_* env vars for flow test.");
  process.exit(2);
}

const marker = `ci-starter-flow-${Date.now()}`;

function requestHeaders(includeJsonContentType = false) {
  const headers = {};
  if (includeJsonContentType) {
    headers["content-type"] = "application/json";
  }
  if (authToken) {
    headers.authorization = `Bearer ${authToken}`;
  }
  return headers;
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${text}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${JSON.stringify(body)}`);
  }

  return body;
}

function assert(condition, message, payload) {
  if (condition) return;
  const context = payload ? `\nPayload: ${JSON.stringify(payload, null, 2)}` : "";
  throw new Error(`${message}${context}`);
}

async function run() {
  const addUrl = `${baseUrl}${addPath}`;
  const searchUrl = `${baseUrl}${searchPath}?q=${encodeURIComponent(marker)}&limit=10`;
  const contextUrl = `${baseUrl}${contextPath}?q=${encodeURIComponent(marker)}&mode=all&limit=10`;

  const addBody = await requestJson(addUrl, {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify({
      content: `Starter flow memory ${marker}`,
      type: "rule",
      tags: ["ci", "starter-flow"],
    }),
  });
  assert(addBody?.ok === true, "Add response did not return ok=true", addBody);

  const searchBody = await requestJson(searchUrl, {
    method: "GET",
    headers: requestHeaders(),
  });
  assert(searchBody?.ok === true, "Search response did not return ok=true", searchBody);
  assert(Array.isArray(searchBody?.memories), "Search response is missing memories[]", searchBody);
  assert(searchBody.memories.length > 0, "Search returned no memories", searchBody);

  const contextBody = await requestJson(contextUrl, {
    method: "GET",
    headers: requestHeaders(),
  });
  assert(contextBody?.ok === true, "Context response did not return ok=true", contextBody);
  assert(Array.isArray(contextBody?.memories), "Context response missing memories[]", contextBody);

  const combined = [
    ...(Array.isArray(contextBody.rules) ? contextBody.rules : []),
    ...contextBody.memories,
  ];
  const foundMarker = combined.some(
    (item) => typeof item?.content === "string" && item.content.includes(marker),
  );
  assert(foundMarker, "Context response missing inserted memory", contextBody);

  console.log("Starter flow test passed", {
    baseUrl,
    addPath,
    searchCount: searchBody.memories.length,
    contextCount: combined.length,
  });
}

run().catch((error) => {
  console.error("Starter flow test failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
