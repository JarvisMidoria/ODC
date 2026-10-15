import assert from "node:assert/strict";
import { test } from "node:test";

test("browser favorites preserve existing colorways, survive storage failures and sync tabs", async () => {
  const previousWindow = globalThis.window;
  const values = new Map([["odc-favorites-v1", '["fabric::blue","fabric::blue",null,7]']]);
  let blocked = false;
  const browser = new EventTarget();
  browser.localStorage = {
    getItem(key) { if (blocked) throw new Error("blocked"); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error("blocked"); values.set(key, value); }
  };
  globalThis.window = browser;
  try {
    const store = await import("../src/favorites-store.js");
    assert.deepEqual(store.getFavoriteProductIds(), ["fabric::blue"]);
    assert.equal(store.hasFavoriteProduct("fabric::red"), false);
    await store.toggleFavoriteProduct("fabric::red");
    assert.deepEqual(JSON.parse(values.get("odc-favorites-v1")), ["fabric::blue", "fabric::red"]);
    await store.toggleFavoriteProduct("fabric::blue");
    assert.deepEqual(store.getFavoriteProductIds(), ["fabric::red"]);
    blocked = true;
    await store.toggleFavoriteProduct("fabric::green");
    assert.deepEqual(store.getFavoriteProductIds(), ["fabric::red", "fabric::green"]);
    await store.toggleFavoriteProduct("fabric::green");
    assert.deepEqual(store.getFavoriteProductIds(), ["fabric::red"]);
    blocked = false;
    values.set("odc-favorites-v1", '["other::black"]');
    let eventCount = 0;
    browser.addEventListener(store.FAVORITES_CHANGE_EVENT, () => eventCount++);
    const external = new Event("storage");
    Object.defineProperty(external, "key", { value: "odc-favorites-v1" });
    browser.dispatchEvent(external);
    assert.deepEqual(store.getFavoriteProductIds(), ["other::black"]);
    assert.equal(eventCount, 1);
    values.clear();
    const cleared = new Event("storage");
    Object.defineProperty(cleared, "key", { value: null });
    browser.dispatchEvent(cleared);
    assert.deepEqual(store.getFavoriteProductIds(), []);
    assert.equal(eventCount, 2);
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});
