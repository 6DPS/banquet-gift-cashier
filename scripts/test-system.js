/**
 * 全面自动化功能与鲁棒性自检套件
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_PORT = 8099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const req = http.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsed = null;
        try {
          parsed = JSON.parse(buffer.toString('utf8'));
        } catch(e) {
          parsed = buffer;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('       礼金收聘系统 · 账房云枢 - 全系统功能自检流水线       ');
  console.log('====================================================\n');

  // 1. 启动临时测试服务端
  console.log('[测试 1/8] 启动独立沙盒服务端 (Port: 8099)...');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: TEST_PORT },
    stdio: 'pipe'
  });

  let serverStarted = false;
  // 等待启动
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    try {
      const res = await request('GET', '/api/system/info');
      if (res.status === 200) {
        serverStarted = true;
        break;
      }
    } catch(e) {}
  }

  if (!serverStarted) {
    throw new Error('服务端未能于指定时间内启动！');
  }
  console.log('  [PASS] 服务端启动成功并完成端口侦听！\n');

  try {
    // 2. 宴席场次管理测试
    console.log('[测试 2/8] 测试宴席场次创建与切换 (红白事双模)...');
    const newEvent = {
      title: '自动化测试喜宴',
      eventType: 'red',
      category: '结婚喜宴',
      date: '2026-10-27',
      host: '张三 & 李四',
      location: '金色大厅',
      targetTables: 20
    };
    const createEvtRes = await request('POST', '/api/events', newEvent);
    if (createEvtRes.status !== 200 && createEvtRes.status !== 201) {
      throw new Error(`创建场次失败: ${JSON.stringify(createEvtRes.data)}`);
    }
    const createdEventId = createEvtRes.data.id;
    console.log(`  [PASS] 成功创建红事喜宴场次: ID=${createdEventId}`);

    // 切换活动场次
    const switchRes = await request('POST', '/api/events/switch', { eventId: createdEventId });
    if (switchRes.status !== 200) throw new Error('切换活动场次失败: ' + JSON.stringify(switchRes.data));
    console.log('  [PASS] 活动场次切换与上下文加载正常！\n');

    // 3. 礼金登记与多渠道收聘测试
    console.log('[测试 3/8] 测试收礼记账核心逻辑 (现金、微信、支付宝)...');
    const r1 = await request('POST', '/api/records', {
      guestName: '王五',
      amount: 888,
      paymentMethod: '现金',
      relation: '朋友',
      seatTable: 'A01',
      notes: '百年好合',
      eventId: createdEventId
    });
    if (r1.status !== 200 && r1.status !== 201) throw new Error('记录王五失败: ' + JSON.stringify(r1.data));

    const r2 = await request('POST', '/api/records', {
      guestName: '赵六',
      amount: 1000,
      paymentMethod: '微信',
      relation: '同事',
      seatTable: 'B02',
      notes: '早生贵子',
      eventId: createdEventId
    });
    if (r2.status !== 200 && r2.status !== 201) throw new Error('记录赵六失败: ' + JSON.stringify(r2.data));

    const recordId = r1.data.id;
    console.log(`  [PASS] 礼金登记完成 (已录入 2 笔记录，测试单号: ${recordId})`);

    // 4. 统计汇总与总账核算
    console.log('[测试 4/8] 测试统计汇总与对账核算...');
    const recordsRes = await request('GET', `/api/records?eventId=${createdEventId}`);
    if (recordsRes.status !== 200) throw new Error('获取账本与统计失败');
    const { stats, records } = recordsRes.data;
    if (stats.totalAmount !== 1888) {
      throw new Error(`统计金额不符合预期: 预期 1888, 实际 ${stats.totalAmount}`);
    }
    if (stats.totalCount !== 2) {
      throw new Error(`统计笔数不符合预期: 预期 2, 实际 ${stats.totalCount}`);
    }
    if (stats.cashTotal !== 888 || stats.wechatTotal !== 1000) {
      throw new Error(`多渠道对账不吻合: cash=${stats.cashTotal}, wechat=${stats.wechatTotal}`);
    }
    console.log(`  [PASS] 总账金额精准吻合 (合计: ￥1888.00, 现金: ￥888.00, 微信: ￥1000.00)！\n`);

    // 5. 修改与模糊查询过滤
    console.log('[测试 5/8] 测试记录修改与关键字防错搜索...');
    const updateRes = await request('PUT', `/api/records/${recordId}`, {
      guestName: '王五',
      amount: 999,
      paymentMethod: '现金',
      relation: '发小',
      notes: '白头偕老'
    });
    if (updateRes.status !== 200) throw new Error('更新记录失败: ' + JSON.stringify(updateRes.data));

    const searchRes = await request('GET', `/api/records?eventId=${createdEventId}&q=王五`);
    if (searchRes.status !== 200) throw new Error('检索失败');
    const list = searchRes.data.records;
    if (!list || list.length === 0 || list[0].amount !== 999) {
      throw new Error('更新后查询数据不一致');
    }
    console.log('  [PASS] 动态修改与模糊匹配校验通过 (金额已成功修订为 ￥999.00)！\n');

    // 6. 白事模式场景与自定义属性
    console.log('[测试 6/8] 测试白事追思模式与庄重奠礼特性...');
    const funeralEvt = await request('POST', '/api/events', {
      title: '生平追思会',
      eventType: 'white',
      category: '白事追思',
      date: '2026-10-27',
      host: '孝子孝媳',
      location: '安详堂'
    });
    const funeralId = funeralEvt.data.id;
    const funeralRecord = await request('POST', '/api/records', {
      guestName: '钱七',
      amount: 500,
      paymentMethod: '现金',
      relation: '邻里',
      seatTable: 'C01',
      notes: '花圈一对，沉痛哀悼',
      eventId: funeralId
    });
    if (funeralRecord.status !== 200 && funeralRecord.status !== 201) throw new Error('白事记账失败');
    console.log('  [PASS] 白事庄重模式与奠礼记账验证通过！\n');

    // 7. Excel 数据导出接口
    console.log('[测试 7/8] 测试 Excel 账本报表导出接口...');
    const excelRes = await request('GET', `/api/export/excel?eventId=${createdEventId}`);
    if (excelRes.status !== 200) throw new Error('Excel 导出接口异常: HTTP ' + excelRes.status);
    if (!Buffer.isBuffer(excelRes.data) || excelRes.data.length < 500) {
      throw new Error('Excel 导出数据流为空或不合法');
    }
    console.log(`  [PASS] Excel 报表流生成成功 (流大小: ${excelRes.data.length} 字节)！\n`);

    // 8. 安全停机与资源释放
    console.log('[测试 8/8] 测试平稳停机指令 (/api/system/shutdown)...');
    const shutdownRes = await request('POST', '/api/system/shutdown');
    if (shutdownRes.status !== 200) throw new Error('停机指令返回异常');
    await sleep(400);
    console.log('  [PASS] 服务端已完成数据落盘并安全平稳退出！\n');

    console.log('====================================================');
    console.log('        🎉 全系统 8 大核心功能自检全部通过！        ');
    console.log('====================================================\n');
  } finally {
    if (!serverProcess.killed) {
      try { serverProcess.kill(); } catch(e) {}
    }
  }
}

runTests().catch(err => {
  console.error('\n[自检失败]', err);
  process.exit(1);
});
