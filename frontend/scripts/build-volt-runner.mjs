#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = new URL("../../", import.meta.url);
const sourceRoot = new URL("apps/volt-runner/", projectRoot);
const publicRoot = new URL("frontend/public/games/volt-runner/", projectRoot);
const checkOnly = process.argv.includes("--check");
const publishEntries = ["index.html", "engine"];

async function exists(url) {
  try {
    await stat(url);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root, relative = "") {
  const directory = new URL(relative || ".", root);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, child)));
    } else if (entry.isFile()) {
      files.push(child);
    }
  }

  return files.sort();
}

async function verifyEntry(entry) {
  const source = new URL(entry, sourceRoot);
  const destination = new URL(entry, publicRoot);
  const sourceInfo = await stat(source);

  if (sourceInfo.isDirectory()) {
    const sourceDirectory = new URL(`${entry}/`, sourceRoot);
    const destinationDirectory = new URL(`${entry}/`, publicRoot);
    const sourceFiles = await listFiles(sourceDirectory);
    const destinationFiles = (await exists(destinationDirectory))
      ? await listFiles(destinationDirectory)
      : [];
    const extraFiles = destinationFiles.filter(
      (relative) => !sourceFiles.includes(relative),
    );
    if (extraFiles.length > 0) {
      throw new Error(
        `Лишние production-файлы в ${entry}: ${extraFiles.join(", ")}`,
      );
    }

    for (const relative of sourceFiles) {
      const sourceFile = new URL(relative, sourceDirectory);
      const destinationFile = new URL(relative, destinationDirectory);
      if (!(await exists(destinationFile))) {
        throw new Error(`Нет production-файла ${entry}/${relative}`);
      }
      const [expected, actual] = await Promise.all([
        readFile(sourceFile),
        readFile(destinationFile),
      ]);
      if (!expected.equals(actual)) {
        throw new Error(`Production-файл устарел: ${entry}/${relative}`);
      }
    }
    return;
  }

  if (!(await exists(destination))) {
    throw new Error(`Нет production-файла ${entry}`);
  }
  const [expected, actual] = await Promise.all([
    readFile(source),
    readFile(destination),
  ]);
  if (!expected.equals(actual)) {
    throw new Error(`Production-файл устарел: ${entry}`);
  }
}

if (!(await exists(new URL("index.html", sourceRoot)))) {
  throw new Error(
    `Не найден исходник VOLT RUNNER: ${fileURLToPath(new URL("index.html", sourceRoot))}`,
  );
}

for (const entry of publishEntries) {
  if (!(await exists(new URL(entry, sourceRoot)))) {
    throw new Error(`Не найден обязательный исходник VOLT RUNNER: ${entry}`);
  }
}
const availableEntries = publishEntries;

if (checkOnly) {
  for (const entry of availableEntries) await verifyEntry(entry);
  console.log(
    `VOLT RUNNER production sync: OK (${availableEntries.join(", ")}).`,
  );
} else {
  await mkdir(publicRoot, { recursive: true });
  for (const entry of availableEntries) {
    const source = new URL(entry, sourceRoot);
    const destination = new URL(entry, publicRoot);
    if ((await stat(source)).isDirectory()) {
      await rm(destination, { recursive: true, force: true });
    }
    await cp(source, destination, {
      recursive: true,
      force: true,
    });
  }
  console.log(
    `VOLT RUNNER собран в ${fileURLToPath(publicRoot)} (${availableEntries.join(", ")}).`,
  );
}
