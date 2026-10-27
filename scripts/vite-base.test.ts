import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveViteBase } from "./vite-base.ts";

test("defaults to the site root", () => {
  assert.equal(resolveViteBase(undefined), "/");
  assert.equal(resolveViteBase(""), "/");
  assert.equal(resolveViteBase("   "), "/");
  assert.equal(resolveViteBase("/"), "/");
});

test("undoes Git Bash conversion of BASE_PATH=/", () => {
  assert.equal(resolveViteBase("C:/Program Files/Git/"), "/");
  assert.equal(resolveViteBase("C:/Program Files/Git"), "/");
  assert.equal(resolveViteBase("D:/Git/"), "/");
});

test("keeps an explicit posix or URL base", () => {
  assert.equal(resolveViteBase("/app/"), "/app/");
  assert.equal(resolveViteBase("https://cdn.example/app/"), "https://cdn.example/app/");
});
