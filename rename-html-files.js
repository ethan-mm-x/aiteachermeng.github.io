const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PAGES_DIR = path.join(__dirname, "pages");
const RENAME_DIR = path.join(__dirname, "rename");
const MAP_FILE = path.join(RENAME_DIR, "rename-map.json");

function isRandomName(name) {
  return /^[a-z0-9]{8}$/.test(name);
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

function findHtmlInDirectory(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && isHtmlFile(item)) {
      return fullPath;
    }
  }
  return null;
}

function collectFolders(dir, folders) {
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      folders.push(fullPath);
      collectFolders(fullPath, folders);
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

  const folders = [];
  collectFolders(PAGES_DIR, folders);

  folders.sort((a, b) => b.length - a.length);

  let changes = 0;

  folders.forEach((folderPath) => {
    const folderName = path.basename(folderPath);

    if (isRandomName(folderName)) {
      console.log(
        `跳过已加密的文件夹: ${path.relative(PAGES_DIR, folderPath)}`,
      );
      return;
    }

    const htmlFile = findHtmlInDirectory(folderPath);
    if (!htmlFile) {
      console.log(
        `警告: ${path.relative(PAGES_DIR, folderPath)} 没有找到 HTML 文件，跳过`,
      );
      return;
    }

    const content = fs.readFileSync(htmlFile, "utf8");
    const title = extractTitle(content);

    if (!title) {
      console.log(
        `警告: ${path.relative(PAGES_DIR, htmlFile)} 没有 <title> 标签，跳过`,
      );
      return;
    }

    let newFolderName;
    do {
      newFolderName = generateRandomName();
    } while (fs.existsSync(path.join(path.dirname(folderPath), newFolderName)));

    const newFolderPath = path.join(path.dirname(folderPath), newFolderName);

    let newHtmlName;
    do {
      newHtmlName = generateRandomName() + ".html";
    } while (fs.existsSync(path.join(folderPath, newHtmlName)));

    const htmlFileName = path.basename(htmlFile);
    const newHtmlPath = path.join(folderPath, newHtmlName);

    fs.renameSync(htmlFile, newHtmlPath);

    fs.renameSync(folderPath, newFolderPath);

    const oldRelativePath = path.relative(PAGES_DIR, htmlFile);
    const newRelativePath = path.join(newFolderName, newHtmlName);

    renameMap[title] = {
      oldFolderName: folderName,
      newFolderName: newFolderName,
      oldHtmlName: htmlFileName,
      newHtmlName: newHtmlName,
      oldPath: oldRelativePath,
      newPath: newRelativePath,
    };

    console.log(`✓ 重命名文件夹: ${folderName} -> ${newFolderName}`);
    console.log(`  重命名文件: ${htmlFileName} -> ${newHtmlName}`);
    console.log(`  标题: ${title}`);
    changes++;
  });

  if (changes > 0) {
    fs.writeFileSync(MAP_FILE, JSON.stringify(renameMap, null, 2), "utf8");
    console.log(`\n完成! 共处理 ${changes} 个文件夹`);
    console.log(`映射文件已保存至: ${MAP_FILE}`);
  } else {
    console.log("\n没有需要处理的文件夹");
  }
}

processHtmlFiles();
