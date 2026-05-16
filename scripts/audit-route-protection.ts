import fs from "node:fs";
import path from "node:path";

const appRoot = path.join(process.cwd(), "src", "app", "(app)");

const protectedTokens = [
  "requireAuth(",
  "requirePermission(",
  "requireAnyPermission(",
  "requireRole(",
];

const filesToCheck = new Set(["page.tsx", "route.ts"]);

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && filesToCheck.has(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isProtected(source: string): boolean {
  return protectedTokens.some((token) => source.includes(token));
}

function main() {
  const files = walk(appRoot);

  const unprotected = files.filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return !isProtected(source);
  });

  if (unprotected.length > 0) {
    console.error("\nUnprotected app routes found:\n");

    for (const file of unprotected) {
      console.error(`- ${path.relative(process.cwd(), file)}`);
    }

    console.error(
      "\nEvery src/app/(app) page.tsx and route.ts file must call requirePermission, requireAnyPermission, or requireRole.\n",
    );

    process.exit(1);
  }

  console.log(
    `Route protection audit passed. Checked ${files.length} protected route files.`,
  );
}

main();