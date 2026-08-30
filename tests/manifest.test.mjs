import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../system.json", import.meta.url), "utf8"));

test("manifest is pinned exactly to Foundry 13.351", () => {
  assert.deepEqual(manifest.compatibility, {
    minimum: "13.351",
    verified: "13.351",
    maximum: "13.351"
  });
});

test("manifest declares all Milestone 1 document subtypes", () => {
  assert.deepEqual(Object.keys(manifest.documentTypes.Actor), ["survivor", "zombie", "vehicle"]);
  assert.deepEqual(Object.keys(manifest.documentTypes.Item), ["weapon", "equipment", "skill"]);
  assert.deepEqual(Object.keys(manifest.documentTypes.Card), ["equipment", "spawn"]);
  assert.equal(Object.keys(manifest.documentTypes.Cards).length, 5);
  assert.equal(manifest.socket, true);
});

test("manifest paths resolve to source files", async () => {
  const paths = [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(language => language.path)];
  await Promise.all(paths.map(path => readFile(new URL(`../${path}`, import.meta.url))));
});

test("localization files contain valid JSON", async () => {
  for (const language of manifest.languages) {
    const contents = await readFile(new URL(`../${language.path}`, import.meta.url), "utf8");
    const translations = JSON.parse(contents);
    assert.equal(typeof translations["ZOMBICIDE.SystemTitle"], "string");
  }
});
