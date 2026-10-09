const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const QRCode = require('qrcode');
const XLSX = require('xlsx');
const { buildStyledBanquetWorkbook } = require('./lib/excel-export');

const PORT = process.env.PORT || 8089;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'lijin_database.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 默认初始数据（红白事各预置真实测试场景）
const DEFAULT_DATA = {
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

const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 内存数据库与持久化加载
let database = DEFAULT_DATA;
let lastBackupTime = 0;

// 自动滚动备份引擎 (保留最近 30 份快照，防止误操作或系统崩溃)
function createRollingBackup(jsonStr) {
  const now = Date.now();
  // 至少间隔 10 秒以上生成一次新快照，或首笔产生即备份
  if (now - lastBackupTime < 10000 && lastBackupTime !== 0) return;
  lastBackupTime = now;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `lijin_backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, jsonStr, 'utf-8');

    // 自动清理多余快照 (最多保留 30 份)
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('lijin_backup_') && f.endsWith('.json'));
    if (files.length > 30) {
      files.sort();
      const toDelete = files.slice(0, files.length - 30);
      toDelete.forEach(f => {
        try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {}
      });
    }
  } catch (err) {
    console.error('创建备份快照异常:', err.message);
  }
}

// 加载数据库 (支持自动从备份快照灾备自愈)
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      if (content && content.trim()) {
        database = JSON.parse(content);
        if (!database.events) database.events = DEFAULT_DATA.events;
        if (!database.records) database.records = DEFAULT_DATA.records;
        if (!database.contacts) database.contacts = DEFAULT_DATA.contacts;
        if (!database.activeEventId && database.events.length > 0) {
          database.activeEventId = database.events[0].id;
        }
        return;
      }
    }
  } catch (err) {
    console.error('主数据库文件解析失败，尝试从最近快照自愈恢复:', err.message);
  }

  // 尝试从备份目录恢复
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse();
      for (const f of files) {
        try {
          const backupContent = fs.readFileSync(path.join(BACKUP_DIR, f), 'utf-8');
          const recovered = JSON.parse(backupContent);
          if (recovered && recovered.events && recovered.records) {
            database = recovered;
            console.log(`[自愈成功] 已从灾备快照 ${f} 恢复数据！`);
            saveDatabase();
            return;
          }
        } catch (e) {}
      }
    }
  } catch (recoverErr) {
    console.error('备份恢复检测失败:', recoverErr);
  }

  // 兜底保障
  database = DEFAULT_DATA;
  saveDatabase();
}

// 异步顺序写队列（消灭并发竞态冲突，原子落盘）
let isWriting = false;
const writeQueue = [];

function saveDatabase() {
  return new Promise((resolve, reject) => {
    writeQueue.push({ resolve, reject });
    processWriteQueue();
  });
}

function processWriteQueue() {
  if (isWriting || writeQueue.length === 0) return;
  isWriting = true;
  const task = writeQueue.shift();

  try {
    const jsonStr = JSON.stringify(database, null, 2);
    const tempFile = DB_FILE + '.' + Date.now() + '.tmp';
    fs.writeFileSync(tempFile, jsonStr, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    createRollingBackup(jsonStr);
    isWriting = false;
    task.resolve(true);
  } catch (err) {
    console.error('写入数据库异常:', err.message);
    isWriting = false;
    task.reject(err);
  }

  if (writeQueue.length > 0) {
    setImmediate(processWriteQueue);
  }
}

loadDatabase();

// SSE (Server-Sent Events) 客户端列表，用于局域网多端毫秒级实时同步
const sseClients = new Set();

function broadcastEvent(type, payload) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// 获取局域网 IP (智能优先物理 Wi-Fi / WLAN 网卡)
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        // 计算网卡优先级：WLAN/Wi-Fi/以太网优先，排除或降级虚拟网卡
        const isVirtual = /VMware|Virtual|vEthernet|Loopback|VPN|iKuuu/i.test(name) || net.address.startsWith('169.254.') || net.address.startsWith('198.18.');
        const isWifi = /WLAN|Wi-Fi|无线|以太网|Ethernet/i.test(name) || net.address.startsWith('192.168.');
        let priority = 50;
        if (isWifi && !isVirtual) priority = 100;
        if (isVirtual) priority = 10;

        addresses.push({
          interface: name,
          ip: net.address,
          url: `http://${net.address}:${PORT}`,
          priority: priority
        });
      }
    }
  }

  // 按优先级从高到低排序
  addresses.sort((a, b) => b.priority - a.priority);

  if (addresses.length === 0) {
    addresses.push({
      interface: '本地环回',
      ip: '127.0.0.1',
      url: `http://localhost:${PORT}`,
      priority: 0
    });
  }
  return addresses;
}

// 金额大写工具
function digitToChinese(num) {
  num = Number(num);
  if (isNaN(num) || num < 0) return '零元整';
  if (num === 0) return '零元整';
  const fraction = ['角', '分'];
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [
    ['元', '万', '亿'],
    ['', '拾', '佰', '仟']
  ];
  let head = num < 0 ? '欠' : '';
  num = Math.abs(num);
  let s = '';
  for (let i = 0; i < fraction.length; i++) {
    s += (digit[Math.floor(num * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
  }
  s = s || '整';
  num = Math.floor(num);
  for (let i = 0; i < unit[0].length && num > 0; i++) {
    let p = '';
    for (let j = 0; j < unit[1].length && num > 0; j++) {
      p = digit[num % 10] + unit[1][j] + p;
      num = Math.floor(num / 10);
    }
    s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
  }
  return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
}

// MIME 映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// HTTP 请求处理器
const server = http.createServer((req, res) => {
  // CORS 支持跨域及局域网调用
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // 1. SSE 实时长连接
  if (pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. API 路由分发
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname, query);
    return;
  }

  // 3. 静态页面与前端资源托管
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // 兜底重定向到 index.html (SPA 路由)
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexPath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      }
    }
  });
});

// JSON 响应助手
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// 解析 JSON Body
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 5 * 1024 * 1024) {
      // 防止超大载荷
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(null, data);
    } catch (e) {
      callback(e, null);
    }
  });
}

// API 请求处理核心
async function handleApiRequest(req, res, pathname, query) {
  // GET /api/system/info
  if (pathname === '/api/system/info' && req.method === 'GET') {
    const ips = getLocalIpAddresses();
    const primaryIp = ips[0] ? ips[0].ip : '127.0.0.1';
    return sendJson(res, 200, {
      port: PORT,
      ips: ips,
      primaryUrl: `http://${primaryIp}:${PORT}`,
      activeEventId: database.activeEventId,
      timestamp: new Date().toISOString()
    });
  }

  // POST /api/system/shutdown - 安全退出并终止后台服务释放所有资源
  if (pathname === '/api/system/shutdown' && req.method === 'POST') {
    sendJson(res, 200, { success: true, message: '系统服务已安全退出，资源已全部释放' });
    setTimeout(() => {
      console.log('系统收到退出指令，正在终止服务进程...');
      process.exit(0);
    }, 400);
    return;
  }

  // GET /api/system/qrcode (标准 PNG 格式高清二维码)
  if (pathname === '/api/system/qrcode' && req.method === 'GET') {
    const qrTarget = query.url || `http://localhost:${PORT}/mobile.html`;
    QRCode.toBuffer(qrTarget, {
      type: 'png',
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M'
    }, (err, buffer) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('二维码生成失败');
      }
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(buffer);
    });
    return;
  }

  // GET /api/export/excel (导出专业排版、高颜值配色与自适应宽度的 Microsoft Excel .xlsx 详单)
  if (pathname === '/api/export/excel' && req.method === 'GET') {
    const eventId = query.eventId || database.activeEventId;
    const currentEvent = database.events.find(e => e.id === eventId) || database.events[0];
    if (!currentEvent) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('未找到宴席事项');
    }

    const records = database.records.filter(r => r.eventId === currentEvent.id);
    const isWhite = (currentEvent.eventType === 'white');

    try {
      const buffer = await buildStyledBanquetWorkbook(currentEvent, records);
      const suffix = isWhite ? '奠仪香仪明细表' : '礼金收聘明细表';
      const filename = `${currentEvent.title}_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': buffer.length,
        'Cache-Control': 'no-cache'
      });
      return res.end(buffer);
    } catch (err) {
      console.error('Excel 导出生成异常:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Excel 详单生成失败，请重试');
    }
  }

  // GET /api/events
  if (pathname === '/api/events' && req.method === 'GET') {
    // 汇总每场活动的统计概览
    const list = database.events.map(ev => {
      const evRecords = database.records.filter(r => r.eventId === ev.id);
      const totalAmount = evRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      return {
        ...ev,
        recordCount: evRecords.length,
        totalAmount: totalAmount
      };
    });
    return sendJson(res, 200, {
      activeEventId: database.activeEventId,
      events: list
    });
  }

  // POST /api/events/switch
  if (pathname === '/api/events/switch' && req.method === 'POST') {
    parseBody(req, (err, body) => {
      if (err || !body.eventId) {
        return sendJson(res, 400, { error: '缺少活动 ID' });
      }
      const target = database.events.find(e => e.id === body.eventId);
      if (!target) {
        return sendJson(res, 404, { error: '未找到指定宴席事项' });
      }
      database.activeEventId = target.id;
      saveDatabase();
      broadcastEvent('event_switched', { activeEventId: target.id, event: target });
      return sendJson(res, 200, { success: true, activeEventId: target.id, event: target });
    });
    return;
  }

  // POST /api/events
  if (pathname === '/api/events' && req.method === 'POST') {
    parseBody(req, (err, body) => {
      if (err || !body.title) {
        return sendJson(res, 400, { error: '事项名称为必填项' });
      }
      const newEvent = {
        id: 'evt_' + Date.now(),
        title: body.title.trim(),
        eventType: body.eventType === 'white' ? 'white' : 'red',
        category: body.category || (body.eventType === 'white' ? '治丧奠仪' : '新婚喜宴'),
        date: body.date || new Date().toISOString().slice(0, 10),
        host: body.host || '东家',
        location: body.location || '',
        targetTables: Number(body.targetTables) || 20,
        notes: body.notes || '',
        createdAt: new Date().toISOString(),
        isArchived: false
      };
      database.events.unshift(newEvent);
      database.activeEventId = newEvent.id;
      saveDatabase();
      broadcastEvent('event_created', newEvent);
      return sendJson(res, 201, newEvent);
    });
    return;
  }

  // PUT /api/events/:id
  if (pathname.startsWith('/api/events/') && req.method === 'PUT') {
    const id = pathname.replace('/api/events/', '');
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: '参数解析失败' });
      const index = database.events.findIndex(e => e.id === id);
      if (index === -1) return sendJson(res, 404, { error: '事项不存在' });

      database.events[index] = {
        ...database.events[index],
        title: body.title !== undefined ? body.title.trim() : database.events[index].title,
        eventType: body.eventType === 'white' ? 'white' : 'red',
        category: body.category !== undefined ? body.category.trim() : database.events[index].category,
        date: body.date || database.events[index].date,
        host: body.host !== undefined ? body.host.trim() : database.events[index].host,
        targetTables: Number(body.targetTables) || database.events[index].targetTables || 20,
        location: body.location !== undefined ? body.location.trim() : database.events[index].location,
        notes: body.notes !== undefined ? body.notes.trim() : database.events[index].notes,
        id: id // 禁止篡改 ID
      };
      saveDatabase();
      broadcastEvent('event_updated', database.events[index]);
      return sendJson(res, 200, database.events[index]);
    });
    return;
  }

  // DELETE /api/events/:id (删除宴席事项及该场次下的独立记录)
  if (pathname.startsWith('/api/events/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/events/', '');
    const index = database.events.findIndex(e => e.id === id);
    if (index === -1) return sendJson(res, 404, { error: '事项不存在' });

    if (database.events.length <= 1) {
      // 当仅存最后一场宴席时，安全删除并自动重置为全新的空白宴席事项
      const blankEvent = {
        id: 'evt_' + Date.now(),
        title: '新设宴席',
        eventType: 'red',
        category: '礼金登记',
        date: new Date().toISOString().slice(0, 10),
        host: '主家',
        location: '',
        targetTables: 20,
        notes: '',
        createdAt: new Date().toISOString(),
        isArchived: false
      };
      database.events = [blankEvent];
      database.records = [];
      database.activeEventId = blankEvent.id;
      saveDatabase();
      broadcastEvent('event_deleted', { id: id, activeEventId: blankEvent.id });
      broadcastEvent('event_created', blankEvent);
      return sendJson(res, 200, { success: true, id, activeEventId: blankEvent.id, resetToBlank: true, newEvent: blankEvent });
    }

    const deletedEvent = database.events.splice(index, 1)[0];
    // 严格清理该宴席所属的所有明细记录，确保多宴席数据互不污染、彻底隔开
    database.records = database.records.filter(r => r.eventId !== id);

    // 如果删除的是当前正在收礼的活动，自动回切到首场活动
    if (database.activeEventId === id) {
      database.activeEventId = database.events[0].id;
    }
    saveDatabase();
    broadcastEvent('event_deleted', { id: id, activeEventId: database.activeEventId });
    return sendJson(res, 200, { success: true, id, activeEventId: database.activeEventId });
  }

  // POST /api/events/:id/theme (切换红事/白事主题)
  if (pathname.includes('/theme') && req.method === 'POST') {
    const id = pathname.replace('/api/events/', '').replace('/theme', '');
    parseBody(req, (err, body) => {
      const ev = database.events.find(e => e.id === id);
      if (!ev) return sendJson(res, 404, { error: '未找到宴席事项' });
      ev.eventType = body.eventType === 'white' ? 'white' : 'red';
      saveDatabase();
      broadcastEvent('event_updated', ev);
      return sendJson(res, 200, ev);
    });
    return;
  }

  // GET /api/records
  if (pathname === '/api/records' && req.method === 'GET') {
    const eventId = query.eventId || database.activeEventId;
    let records = database.records.filter(r => r.eventId === eventId);

    // 搜索过滤
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      records = records.filter(r =>
        (r.guestName && r.guestName.toLowerCase().includes(q)) ||
        (r.relation && r.relation.toLowerCase().includes(q)) ||
        (r.seatTable && r.seatTable.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.paymentMethod && r.paymentMethod.toLowerCase().includes(q))
      );
    }

    // 支付方式过滤
    if (query.paymentMethod && query.paymentMethod !== '全部') {
      records = records.filter(r => r.paymentMethod === query.paymentMethod);
    }

    // 亲友关系过滤
    if (query.relation && query.relation !== '全部') {
      records = records.filter(r => r.relation === query.relation);
    }

    // 默认倒序排列（最新录入在前）
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 计算统计指标
    const allForEvent = database.records.filter(r => r.eventId === eventId);
    const totalAmount = allForEvent.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const cashTotal = allForEvent.filter(r => r.paymentMethod === '现金').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const wechatTotal = allForEvent.filter(r => r.paymentMethod === '微信').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const alipayTotal = allForEvent.filter(r => r.paymentMethod === '支付宝').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const bankTotal = allForEvent.filter(r => r.paymentMethod === '银行卡').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const giftRecords = allForEvent.filter(r => r.paymentMethod === '实物礼品');
    const giftTotal = giftRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const giftCount = giftRecords.length;
    const otherTotal = totalAmount - cashTotal - wechatTotal - alipayTotal - bankTotal;

    const currentEvent = database.events.find(e => e.id === eventId);

    return sendJson(res, 200, {
      event: currentEvent,
      records: records,
      stats: {
        totalAmount,
        totalCount: allForEvent.length,
        cashTotal,
        wechatTotal,
        alipayTotal,
        bankTotal,
        giftTotal,
        giftCount,
        otherTotal,
        avgAmount: allForEvent.length > 0 ? Math.round(totalAmount / allForEvent.length) : 0
      }
    });
  }

  // POST /api/records
  if (pathname === '/api/records' && req.method === 'POST') {
    parseBody(req, (err, body) => {
      const isGift = (body && body.paymentMethod === '实物礼品');
      if (err || !body.guestName || (!isGift && body.amount === undefined)) {
        return sendJson(res, 400, { error: '宾客姓名与礼金金额为必填项' });
      }

      const eventId = body.eventId || database.activeEventId;
      const targetEvt = database.events.find(e => e.id === eventId);
      const isWhite = (targetEvt && targetEvt.eventType === 'white');
      const amountNum = Math.max(0, Number(body.amount) || 0);

      let amountWords = '';
      if (isGift) {
        amountWords = isWhite ? '实物奠礼' : '实物礼品';
      } else {
        amountWords = digitToChinese(amountNum);
      }

      const newRecord = {
        id: 'rec_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        eventId: eventId,
        guestName: body.guestName.trim(),
        amount: amountNum,
        amountInWords: amountWords,
        paymentMethod: body.paymentMethod || '现金',
        relation: body.relation ? body.relation.trim() : (isWhite ? '孝家亲友' : '亲朋好友'),
        seatTable: body.seatTable ? body.seatTable.trim() : '',
        giftItems: body.giftItems ? body.giftItems.trim() : '',
        recorder: body.recorder || (body.channel === 'mobile' ? '手机分台' : '主台账房'),
        channel: body.channel || 'desktop',
        notes: body.notes ? body.notes.trim() : '',
        returnStatus: 'pending',
        returnAmount: 0,
        returnNotes: '',
        createdAt: new Date().toISOString()
      };

      database.records.unshift(newRecord);

      // 自动建立/更新亲友通讯录历史
      let contact = database.contacts.find(c => c.name === newRecord.guestName);
      if (!contact) {
        database.contacts.push({
          name: newRecord.guestName,
          relation: newRecord.relation,
          phone: body.phone || '',
          remark: '初次录入于 ' + (database.events.find(e => e.id === eventId)?.title || '礼金台')
        });
      }

      saveDatabase();
      broadcastEvent('record_added', newRecord);
      return sendJson(res, 201, newRecord);
    });
    return;
  }

  // PUT /api/records/:id
  if (pathname.startsWith('/api/records/') && req.method === 'PUT') {
    const id = pathname.replace('/api/records/', '');
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: '无效请求数据' });
      const index = database.records.findIndex(r => r.id === id);
      if (index === -1) return sendJson(res, 404, { error: '记录不存在' });

      const updated = {
        ...database.records[index],
        ...body,
        id: id // 保持 ID 不变
      };
      if (body.amount !== undefined || body.paymentMethod !== undefined) {
        const isGiftEdit = (updated.paymentMethod === '实物礼品');
        const targetEvt = database.events.find(e => e.id === updated.eventId);
        const isWhiteEvt = (targetEvt && targetEvt.eventType === 'white');
        if (isGiftEdit) {
          updated.amount = 0;
          updated.amountInWords = isWhiteEvt ? '实物奠礼' : '实物礼品';
        } else {
          updated.amount = Math.max(0, Number(updated.amount) || 0);
          updated.amountInWords = digitToChinese(updated.amount);
        }
      }
      database.records[index] = updated;
      saveDatabase();
      broadcastEvent('record_updated', updated);
      return sendJson(res, 200, updated);
    });
    return;
  }

  // DELETE /api/records/:id
  if (pathname.startsWith('/api/records/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/records/', '');
    const index = database.records.findIndex(r => r.id === id);
    if (index === -1) return sendJson(res, 404, { error: '记录不存在' });

    const deleted = database.records.splice(index, 1)[0];
    saveDatabase();
    broadcastEvent('record_deleted', { id: id, eventId: deleted.eventId });
    return sendJson(res, 200, { success: true, id });
  }

  // GET /api/contacts/history (人情往来/还礼查询)
  if (pathname === '/api/contacts/history' && req.method === 'GET') {
    const name = query.name ? query.name.trim() : '';
    let result = [];

    if (name) {
      // 查询特定宾客在所有宴席中的随礼记录
      const history = database.records.filter(r => r.guestName.toLowerCase() === name.toLowerCase());
      const eventMap = new Map(database.events.map(e => [e.id, e]));
      result = history.map(h => ({
        ...h,
        eventTitle: eventMap.get(h.eventId)?.title || '未知活动',
        eventType: eventMap.get(h.eventId)?.eventType || 'red',
        eventDate: eventMap.get(h.eventId)?.date || ''
      }));
    } else {
      // 聚合所有人情往来名册
      const personMap = new Map();
      const eventMap = new Map(database.events.map(e => [e.id, e]));

      for (const r of database.records) {
        if (!personMap.has(r.guestName)) {
          personMap.set(r.guestName, {
            guestName: r.guestName,
            relation: r.relation,
            totalReceived: 0,
            eventCount: 0,
            pendingReturns: 0,
            records: []
          });
        }
        const p = personMap.get(r.guestName);
        p.totalReceived += (Number(r.amount) || 0);
        p.eventCount += 1;
        if (r.returnStatus === 'pending') {
          p.pendingReturns += 1;
        }
        p.records.push({
          ...r,
          eventTitle: eventMap.get(r.eventId)?.title || '未知活动',
          eventDate: eventMap.get(r.eventId)?.date || ''
        });
      }
      result = Array.from(personMap.values());
    }

    return sendJson(res, 200, { data: result });
  }

  // POST /api/contacts/return-gift (记录还礼情况)
  if (pathname === '/api/contacts/return-gift' && req.method === 'POST') {
    parseBody(req, (err, body) => {
      if (err || !body.recordId) {
        return sendJson(res, 400, { error: '缺少记录 ID' });
      }
      const rec = database.records.find(r => r.id === body.recordId);
      if (!rec) return sendJson(res, 404, { error: '未找到对应随礼记录' });

      rec.returnStatus = body.returnStatus || 'returned';
      rec.returnAmount = Number(body.returnAmount) || rec.amount;
      rec.returnNotes = body.returnNotes || `已于 ${new Date().toISOString().slice(0, 10)} 回礼`;
      saveDatabase();
      broadcastEvent('record_updated', rec);
      return sendJson(res, 200, rec);
    });
    return;
  }

  // 404 API
  sendJson(res, 404, { error: '未定义接口路径' });
}

// 监听异常处理（端口复用或已启动时优雅处理）
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[提示] 端口 ${PORT} 已在运行中，无需重复启动。`);
    process.exit(0);
  } else {
    console.error('服务器运行异常:', err);
    process.exit(1);
  }
});

// 启动服务监听
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('================================================================');
  console.log(`  礼金收聘系统 (局域网多端协同版) 已在端口 ${PORT} 启动成功！`);
  console.log('----------------------------------------------------------------');
  console.log(`  电脑主控台访问地址 : http://localhost:${PORT}`);
  ips.forEach(i => {
    console.log(`  手机扫码局域网地址 : http://${i.ip}:${PORT} (${i.interface})`);
  });
  console.log('================================================================');
});
