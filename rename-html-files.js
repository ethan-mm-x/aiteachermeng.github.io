const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PAGES_DIR = path.join(__dirname, "pages");
const RENAME_DIR = path.join(__dirname, "rename");
const MAP_FILE = path.join(RENAME_DIR, "rename-map.json");

function isRandomName(filename) {
  const nameWithoutExt = filename.replace(".html", "");
  return /^[a-z0-9]{8}$/.test(nameWithoutExt);
}

function generateRandomName() {
  return crypto.randomBytes(4).toString("hex");
}

function extractTitle(htmlContent) {
  const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function isHtmlFile(filename) {
  return filename === "index.html" || filename === "index-encrypted.html";
}

function scanDirectory(dir, renameMap, changes) {
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, renameMap, changes);
    } else if (stat.isFile() && isHtmlFile(item)) {
      if (isRandomName(item)) {
        console.log(
          `跳过已随机命名的文件: ${path.relative(PAGES_DIR, fullPath)}`,
        );
        return;
      }

      const content = fs.readFileSync(fullPath, "utf8");
      const title = extractTitle(content);

      if (!title) {
        console.log(
          `警告: ${path.relative(PAGES_DIR, fullPath)} 没有 <title> 标签，跳过`,
        );
        return;
      }

      let newName;
      do {
        newName = generateRandomName() + ".html";
      } while (fs.existsSync(path.join(path.dirname(fullPath), newName)));

      const newPath = path.join(path.dirname(fullPath), newName);
      const relativePath = path.relative(PAGES_DIR, fullPath);
      const newRelativePath = path.relative(PAGES_DIR, newPath);

      fs.renameSync(fullPath, newPath);
      renameMap[title] = {
        oldPath: relativePath,
        newPath: newRelativePath,
      };

      console.log(
        `✓ 重命名: ${relativePath} -> ${newRelativePath} (标题: ${title})`,
      );
      changes.count++;
    }
  });
}

function processHtmlFiles() {
  if (!fs.existsSync(RENAME_DIR)) {
    fs.mkdirSync(RENAME_DIR, { recursive: true });
  }

  let renameMap = {};
  if (fs.existsSync(MAP_FILE)) {
    renameMap = JSON.parse(fs.readFileSync(MAP_FILE, "utf8"));
  }

  const changes = { count: 0 };

  scanDirectory(PAGES_DIR, renameMap, changes);

  if (changes.count > 0) {
    fs.writeFileSync(MAP_FILE, JSON.stringify(renameMap, null, 2), "utf8");
    console.log(`\n完成! 共重命名 ${changes.count} 个文件`);
    console.log(`映射文件已保存至: ${MAP_FILE}`);
  } else {
    console.log("\n没有需要重命名的文件");
  }
}

processHtmlFiles();
