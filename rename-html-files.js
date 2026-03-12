const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PAGES_DIR = path.join(__dirname, 'pages');
const RENAME_DIR = path.join(__dirname, 'rename');
const MAP_FILE = path.join(RENAME_DIR, 'rename-map.json');

function isRandomName(filename) {
    const nameWithoutExt = filename.replace('.html', '');
    return /^[a-z0-9]{8}$/.test(nameWithoutExt);
}

function generateRandomName() {
    return crypto.randomBytes(4).toString('hex');
}

function extractTitle(htmlContent) {
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
}

function processHtmlFiles() {
    if (!fs.existsSync(RENAME_DIR)) {
        fs.mkdirSync(RENAME_DIR, { recursive: true });
    }

    let renameMap = {};
    if (fs.existsSync(MAP_FILE)) {
        renameMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    }

    const files = fs.readdirSync(PAGES_DIR);
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    let changes = 0;

    htmlFiles.forEach(filename => {
        if (isRandomName(filename)) {
            console.log(`跳过已随机命名的文件: ${filename}`);
            return;
        }

        const filePath = path.join(PAGES_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        const title = extractTitle(content);

        if (!title) {
            console.log(`警告: ${filename} 没有 <title> 标签，跳过`);
            return;
        }

        let newName;
        do {
            newName = generateRandomName() + '.html';
        } while (fs.existsSync(path.join(PAGES_DIR, newName)));

        const newPath = path.join(PAGES_DIR, newName);
        
        fs.renameSync(filePath, newPath);
        renameMap[title] = newName;
        
        console.log(`✓ 重命名: ${filename} -> ${newName} (标题: ${title})`);
        changes++;
    });

    if (changes > 0) {
        fs.writeFileSync(MAP_FILE, JSON.stringify(renameMap, null, 2), 'utf8');
        console.log(`\n完成! 共重命名 ${changes} 个文件`);
        console.log(`映射文件已保存至: ${MAP_FILE}`);
    } else {
        console.log('\n没有需要重命名的文件');
    }
}

processHtmlFiles();
