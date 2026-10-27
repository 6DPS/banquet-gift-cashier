/**
 * ==============================================================================
 * 礼金收聘系统 · 账房云枢 - Windows 独立应用程序安装包构建流水线
 * ==============================================================================
 * 核心特性：
 * 1. 自动编译 C# 原生防黑框、防闪退桌面启动器 (BanquetCashier.exe)，内嵌烫金专属“礼”图标。
 * 2. 自动捕获宿主 Node.js 绿色便携运行时 (零环境依赖，接收方电脑免装 Node.js)。
 * 3. 智能打包过滤生产依赖 (保留 Excel/QR 等生产包，剔除 Inno 编译器等开发套件)。
 * 4. 预置洁净初始账本模板，严格杜绝开发测试数据泄露。
 * 5. 调用 Inno Setup 编译器，采用 LZMA2 极限压缩，生成单文件 Windows 应用程序安装包。
 * 6. 生成物直出工作区 dist/ 目录，即刻可分发给任何客户或亲友。
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_TEMP = path.join(ROOT_DIR, 'build_temp');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ISS_FILE = path.join(ROOT_DIR, 'installer', 'setup.iss');
const ISCC_EXE = path.join(ROOT_DIR, 'node_modules', 'innosetup-compiler', 'bin', 'ISCC.exe');

console.log('===============================================================');
console.log('   礼金收聘系统 · 账房云枢 - 应用程序安装包构建流水线 (Windows)   ');
console.log('===============================================================\n');

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDirectorySync(src, dest, filterFn) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (filterFn && !filterFn(srcPath, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 步骤 1: 检查并编译 C# 原生桌面主程序 (BanquetCashier.exe)
console.log('[1/6] 检查并构建桌面原生主程序 (BanquetCashier.exe)...');
const cscPaths = [
  'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
  'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'
];
let cscExe = cscPaths.find(p => fs.existsSync(p));
if (!cscExe) {
  console.error('[错误] 未在系统检测到 .NET Framework 4.0+ 编译器 (csc.exe)。');
  process.exit(1);
}
console.log(`  找到 .NET 编译器: ${cscExe}`);

const compileCmd = `"${cscExe}" /target:winexe /win32icon:"${path.join(ROOT_DIR, 'assets', 'app.ico')}" /r:"${path.join(ROOT_DIR, 'lib-desktop', 'Microsoft.Web.WebView2.WinForms.dll')}" /r:"${path.join(ROOT_DIR, 'lib-desktop', 'Microsoft.Web.WebView2.Core.dll')}" /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"${path.join(ROOT_DIR, 'BanquetCashier.exe')}" "${path.join(ROOT_DIR, 'src-launcher', 'Program.cs')}"`;
try {
  execSync(compileCmd, { stdio: 'inherit', cwd: ROOT_DIR });
  console.log('  [OK] 原生桌面程序重新编译成功！内嵌烫金专属图标与 WebView2 独立渲染内核。\n');
} catch (err) {
  console.error('[错误] 原生桌面启动器编译失败:', err.message);
  process.exit(1);
}

// 步骤 2: 捕获绿色便携运行时与准备构建临时沙盒
console.log('[2/6] 准备沙盒构建目录 (build_temp)...');
cleanDirectory(BUILD_TEMP);
fs.mkdirSync(BUILD_TEMP, { recursive: true });

// 复制 Node 便携二进制
const runtimeDir = path.join(ROOT_DIR, 'runtime');
const bundledNode = path.join(runtimeDir, 'node.exe');
if (!fs.existsSync(bundledNode)) {
  const hostNode = process.execPath;
  console.log(`  正在捕获宿主 Node.js 便携绿色二进制: ${hostNode}`);
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.copyFileSync(hostNode, bundledNode);
} else {
  console.log(`  [OK] 绿色 Node.js 运行时已就绪: ${bundledNode}`);
}

// 准备出厂纯净初始数据
const buildDataDir = path.join(BUILD_TEMP, 'data');
fs.mkdirSync(buildDataDir, { recursive: true });
const initialData = {
  activeEventId: 'evt_wedding_init',
  events: [
    {
      id: 'evt_wedding_init',
      title: '华堂大喜婚宴',
      eventType: 'red',
      category: '结婚喜宴',
      date: new Date().toISOString().slice(0, 10),
      host: '东家 (主家)',
      location: '主宴会大厅',
      targetTables: 30,
      notes: '欢迎各界亲友莅临指导，共沾喜气',
      createdAt: new Date().toISOString(),
      isArchived: false
    }
  ],
  records: [],
  contacts: []
};
fs.writeFileSync(path.join(buildDataDir, 'lijin_database.json'), JSON.stringify(initialData, null, 2), 'utf8');
console.log('  [OK] 标准初始账本数据模板已生成。\n');

// 步骤 3: 提取生产级依赖项
console.log('[3/6] 提取生产级依赖项 (排除开发编译套件)...');
const prodModulesDest = path.join(BUILD_TEMP, 'node_modules_prod');
fs.mkdirSync(prodModulesDest, { recursive: true });

const srcModules = path.join(ROOT_DIR, 'node_modules');
if (fs.existsSync(srcModules)) {
  const entries = fs.readdirSync(srcModules);
  for (const entry of entries) {
    if (entry === 'innosetup-compiler' || entry === '.bin' || entry === '.package-lock.json') {
      continue;
    }
    const srcSub = path.join(srcModules, entry);
    const destSub = path.join(prodModulesDest, entry);
    copyDirectorySync(srcSub, destSub);
  }
}
console.log('  [OK] 生产依赖已成功提取并精简优化！\n');

// 步骤 4: 校验 Inno Setup 编译器与语言环境
console.log('[4/6] 校验 Inno Setup 编译环境...');
if (!fs.existsSync(ISCC_EXE)) {
  console.error(`[错误] 未找到 Inno Setup 命令行编译器: ${ISCC_EXE}`);
  process.exit(1);
}

// 确保语言文件到位
const innoLangDir = path.join(ROOT_DIR, 'node_modules', 'innosetup-compiler', 'bin', 'Languages');
const localLangFile = path.join(ROOT_DIR, 'installer', 'ChineseSimplified.isl');
const targetLangFile = path.join(innoLangDir, 'ChineseSimplified.isl');

if (fs.existsSync(localLangFile) && !fs.existsSync(targetLangFile)) {
  fs.copyFileSync(localLangFile, targetLangFile);
}
console.log('  [OK] 编译器与中文字符集包校验通过！\n');

// 步骤 5: 执行 Inno Setup 编译打包
console.log('[5/6] 正在调用 Inno Setup 6 编译独立单文件安装程序 (LZMA2 极限压缩)...');
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

try {
  const isccResult = spawnSync(ISCC_EXE, [ISS_FILE], {
    cwd: path.join(ROOT_DIR, 'installer'),
    stdio: 'inherit'
  });

  if (isccResult.status !== 0) {
    throw new Error(`Inno Setup 编译退出码: ${isccResult.status}`);
  }
  console.log('  [OK] Inno Setup 编译成功完成！\n');
} catch (err) {
  console.error('[错误] Inno Setup 编译失败:', err.message);
  process.exit(1);
}

// 步骤 6: 清理沙盒与产物汇报
console.log('[6/6] 清理构建临时沙盒与产物校验...');
cleanDirectory(BUILD_TEMP);

const setupExe = path.join(DIST_DIR, '礼金收聘系统_Setup_v1.5.0.exe');
if (fs.existsSync(setupExe)) {
  const stats = fs.statSync(setupExe);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log('===============================================================');
  console.log('                    🎉 安装程序打包大功告成！                    ');
  console.log('===============================================================');
  console.log(`  安装包名称 : 礼金收聘系统_Setup_v1.5.0.exe`);
  console.log(`  安装包文件 : ${setupExe}`);
  console.log(`  文件总大小 : ${sizeMB} MB (已高度内嵌自包含 Node.js 绿色便携运行时)`);
  console.log('---------------------------------------------------------------');
  console.log('  使用与分发指南：');
  console.log('  1. 您可以直接将 dist/ 目录下的 exe 安装文件发送给任何人或客户。');
  console.log('  2. 对方电脑无需安装 Node.js、无需运行黑框命令行，双击即可完成图形化安装。');
  console.log('  3. 采用原生 WinForms + WebView2 独立渲染窗口，绝不调用外部 Edge 浏览器。');
  console.log('  4. 任务栏专属呈现红底烫金“礼”应用图标，绝不影响反重力 IDE 或其他任何软件。');
  console.log('  5. 支持在 Windows“控制面板 / 应用和功能”中一键干净卸载，可选择保留或清理账本。');
  console.log('===============================================================\n');
} else {
  console.error('[错误] 未能成功在 dist/ 目录找到生成的安装程序！');
  process.exit(1);
}
