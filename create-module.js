import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createModule(moduleName) {
  const modulePath = path.join(__dirname, "src", "modules", moduleName);

  if (fs.existsSync(modulePath)) {
    console.error(`Module "${moduleName}" already exists.`);
    return;
  }

  fs.mkdirSync(modulePath, { recursive: true });
  const files = [
    `${moduleName}.type.ts`,
    `${moduleName}.interface.ts`,
    `${moduleName}.controller.ts`,
    `${moduleName}.route.ts`,
    `${moduleName}.repository.ts`,
    `${moduleName}.service.ts`,
    `${moduleName}.model.ts`,
    `${moduleName}.schema.ts`,
    `${moduleName}.utils.ts`,
  ];

  files.forEach((fileName) => {
    const filePath = path.join(modulePath, fileName);
    fs.writeFileSync(filePath, "");
  });

  console.log(`Module "${moduleName}" has been created successfully with empty files.`);
}

const moduleName = process.argv[2];
if (!moduleName) {
  console.error("Please provide a module name.");
  process.exit(1);
}

createModule(moduleName);
