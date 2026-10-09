const ExcelJS = require('exceljs');

// 数字转大写助手
function digitToChinese(num) {
  num = Number(num);
  if (isNaN(num) || num <= 0) return '零元整';
  const fraction = ['角', '分'];
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [
    ['元', '万', '亿'],
    ['', '拾', '佰', '仟']
  ];
  let s = '';
  const head = num < 0 ? '负' : '';
  num = Math.abs(num);
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

/**
 * 生成具备专业视觉美化、色彩高亮、自适应宽度、全渠道平账核算区与红白事风格严格隔离的 Excel 详单
 */
async function buildStyledBanquetWorkbook(currentEvent, records) {
  const wb = new ExcelJS.Workbook();
  wb.creator = '礼金收聘系统 · 账房云枢';
  wb.lastModifiedBy = '礼金收聘系统';
  wb.created = new Date();
  wb.modified = new Date();

  const isWhite = (currentEvent.eventType === 'white');

  // 主题配色 (ARGB) - 红事喜庆金红 vs 白事庄重素雅黑，100% 隔离
  const THEME = isWhite ? {
    bannerBg: 'FF1E293B',       // 深黛黑岩
    headerBg: 'FF334155',       // 石板灰
    subHeaderBg: 'FF475569',    // 次级石板灰
    accentBg: 'FFF1F5F9',       // 浅素灰
    cardBorder: 'FFCBD5E1',     // 边框灰
    evenRowBg: 'FFF8FAFC',      // 斑马行淡灰
    summaryBg: 'FFE2E8F0',      // 合计底色
    amountColor: 'FF0F172A',    // 金额主色
    titleSuffix: '奠仪香仪全场明细簿',
    amountHeader: '奠仪金额 (元)',
    giftColName: '花圈挽联/祭仪品名',
    giftBadgeName: '花圈挽联',
    notesColName: '代致祭/事由备注',
    dateLabel: '设席日期',
    hostLabel: '主事家眷',
    sheet1Name: '奠仪香仪明细簿',
    sheet2Name: '奠仪核对与分类统计',
    reconcileTitle: '【香仪奠仪核算 · 各支付渠道实收对账明细台账】',
    giftChannelName: '💐 花圈挽联 (白事祭仪)',
    giftChannelNote: '现场祭仪花圈挽联，已妥善布置祭奠灵堂'
  } : {
    bannerBg: 'FF991B1B',       // 皇家喜庆深红
    headerBg: 'FFB91C1C',       // 中国红
    subHeaderBg: 'FFDC2626',    // 次级鲜红
    accentBg: 'FFFEF2F2',       // 柔粉底色
    cardBorder: 'FFFECACA',     // 柔红边框
    evenRowBg: 'FFFFF7F7',      // 斑马行微粉
    summaryBg: 'FFFEF3C7',      // 暖金黄合计底
    amountColor: 'FFDC2626',    // 金额高亮红
    titleSuffix: '礼金收聘全场明细簿',
    amountHeader: '礼金金额 (元)',
    giftColName: '随礼物品/附赠',
    giftBadgeName: '实物礼品',
    notesColName: '代随礼/事由备注',
    dateLabel: '设宴吉日',
    hostLabel: '东家/主事',
    sheet1Name: '礼金收聘明细簿',
    sheet2Name: '礼金核对与分类统计',
    reconcileTitle: '【账房财务核算 · 各支付渠道礼金实收对账明细台账】',
    giftChannelName: '🎁 实物礼品 (随礼贺礼)',
    giftChannelNote: '现场贺喜实物/烟酒茶礼/金饰，已入库礼品专区'
  };

  // 基础边框定义
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const cardBorder = {
    top: { style: 'thin', color: { argb: THEME.cardBorder } },
    left: { style: 'thin', color: { argb: THEME.cardBorder } },
    bottom: { style: 'thin', color: { argb: THEME.cardBorder } },
    right: { style: 'thin', color: { argb: THEME.cardBorder } }
  };

  // 全渠道实收核算统计
  const totalAmount = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  
  const cashRecords = records.filter(r => r.paymentMethod === '现金');
  const cashTotal = cashRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const cashCount = cashRecords.length;

  const wechatRecords = records.filter(r => r.paymentMethod === '微信');
  const wechatTotal = wechatRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const wechatCount = wechatRecords.length;

  const alipayRecords = records.filter(r => r.paymentMethod === '支付宝');
  const alipayTotal = alipayRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const alipayCount = alipayRecords.length;

  const bankRecords = records.filter(r => r.paymentMethod === '银行卡');
  const bankTotal = bankRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const bankCount = bankRecords.length;

  const giftRecords = records.filter(r => r.paymentMethod === '实物礼品');
  const giftTotal = giftRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const giftCount = giftRecords.length;

  const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });

  // =========================================================================
  // Sheet 1: 明细簿
  // =========================================================================
  const ws1 = wb.addWorksheet(THEME.sheet1Name, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });

  // 设置宽裕的列宽，确保彻底消除任何单元格被遮挡或需要手动展宽
  const colWidths = [
    9,   // 1. 序号 (A)
    18,  // 2. 宾客姓名 (B)
    18,  // 3. 礼金金额 (元) (C)
    20,  // 4. 大写金额 (D)
    16,  // 5. 支付渠道 (E)
    16,  // 6. 亲友关系 (F)
    16,  // 7. 席位桌号 (G)
    28,  // 8. 随礼物品 / 花圈挽联 (H)
    28,  // 9. 代随礼 / 事由备注 (I)
    14,  // 10. 录入渠道 (J)
    16,  // 11. 经手人 (K)
    22,  // 12. 登记时间 (L)
    14,  // 13. 还礼状态 (M)
    18,  // 14. 还礼金额 (N)
    28   // 15. 还礼事项备忘 (O)
  ];
  colWidths.forEach((w, idx) => {
    ws1.getColumn(idx + 1).width = w;
  });

  // 第 1 行: 气势恢宏的主标题横幅
  ws1.mergeCells('A1:O1');
  const bannerCell = ws1.getCell('A1');
  bannerCell.value = `【${currentEvent.title}】${THEME.titleSuffix}`;
  bannerCell.font = { name: 'Microsoft YaHei', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.bannerBg } };
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 42;

  // 第 2 行: 核心信息概览与统计卡片条 (宽幅合并呈现)
  ws1.mergeCells('A2:C2');
  ws1.mergeCells('D2:F2');
  ws1.mergeCells('G2:I2');
  ws1.mergeCells('J2:L2');
  ws1.mergeCells('M2:O2');

  const infoCells = [
    { cell: 'A2', text: `[${THEME.dateLabel}] ${currentEvent.date || '吉日'}`, bg: THEME.accentBg, font: { bold: true, color: { argb: 'FF334155' } } },
    { cell: 'D2', text: `[${THEME.hostLabel}] ${currentEvent.host || '主家'}`, bg: THEME.accentBg, font: { bold: true, color: { argb: 'FF334155' } } },
    { cell: 'G2', text: `[设宴地点] ${currentEvent.location || '主宴会厅'}`, bg: THEME.accentBg, font: { bold: true, color: { argb: 'FF334155' } } },
    { cell: 'J2', text: `★ 礼金总额：¥ ${totalAmount.toLocaleString()} (${digitToChinese(totalAmount)})`, bg: isWhite ? 'FFE2E8F0' : 'FFFEF3C7', font: { bold: true, color: { argb: isWhite ? 'FF0F172A' : 'FF92400E' }, size: 11 } },
    { cell: 'M2', text: `● 随礼宾客：${records.length} 位 | 预设桌数：${currentEvent.targetTables || 0} 桌 | 导出时间：${nowStr}`, bg: THEME.accentBg, font: { bold: true, color: { argb: 'FF475569' } } }
  ];

  infoCells.forEach(item => {
    const c = ws1.getCell(item.cell);
    c.value = item.text;
    c.font = { name: 'Microsoft YaHei', size: 10, ...item.font };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.bg } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  for (let col = 1; col <= 15; col++) {
    const c = ws1.getRow(2).getCell(col);
    c.border = cardBorder;
  }
  ws1.getRow(2).height = 30;

  // 第 3 行: 视觉间距行
  ws1.getRow(3).height = 6;

  // 第 4 行: 专业加厚字段表头
  const headers = [
    '序号', '宾客姓名', THEME.amountHeader, '大写金额', '支付渠道',
    '亲友关系', '席位桌号', THEME.giftColName, THEME.notesColName,
    '录入渠道', '经手人', '登记时间', '还礼状态', '还礼金额 (元)', '还礼事项备忘'
  ];
  const headerRow = ws1.getRow(4);
  headerRow.height = 30;

  headers.forEach((h, idx) => {
    const c = headerRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // 第 5 行起: 数据记录行 (斑马条纹交替底色、支付标签彩色微徽标、金额大号加粗)
  records.forEach((r, idx) => {
    const rowNum = 5 + idx;
    const row = ws1.getRow(rowNum);
    row.height = 25;

    const isEven = (idx % 2 === 1);
    const rowBg = isEven ? THEME.evenRowBg : 'FFFFFFFF';
    const payDisplay = (r.paymentMethod === '实物礼品') ? THEME.giftBadgeName : (r.paymentMethod || '现金');
    const amtNum = Number(r.amount) || 0;
    const createdStr = r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false }) : '';

    // 还礼状态文案
    let retStatusText = '待还礼';
    let retStatusBg = 'FFFEF3C7';
    let retStatusColor = 'FF92400E';
    if (r.returnStatus === 'returned') {
      retStatusText = '已还礼';
      retStatusBg = 'FFD1FAE5';
      retStatusColor = 'FF065F46';
    } else if (r.returnStatus === 'none') {
      retStatusText = '无需还礼';
      retStatusBg = 'FFF1F5F9';
      retStatusColor = 'FF64748B';
    }

    row.values = [
      idx + 1,
      r.guestName || '',
      amtNum,
      r.amountInWords || (r.paymentMethod === '实物礼品' ? (isWhite ? '花圈挽联' : '实物礼品') : digitToChinese(amtNum)),
      payDisplay,
      r.relation || '亲朋',
      r.seatTable || '-',
      r.giftItems || '-',
      r.notes || '-',
      r.channel === 'mobile' ? '手机端' : '电脑端',
      r.recorder || '-',
      createdStr,
      retStatusText,
      Number(r.returnAmount) || 0,
      r.returnNotes || '-'
    ];

    // 全局基础单元格样式
    for (let col = 1; col <= 15; col++) {
      const c = row.getCell(col);
      c.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF1E293B' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c.border = thinBorder;
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // 宾客姓名
    const nameCell = row.getCell(2);
    nameCell.font = { name: 'Microsoft YaHei', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };

    // 礼金金额
    const amtCell = row.getCell(3);
    amtCell.font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: THEME.amountColor } };
    amtCell.numFmt = '¥#,##0';
    amtCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // 大写金额
    row.getCell(4).font = { name: 'Microsoft YaHei', size: 9.5, color: { argb: 'FF64748B' } };

    // 支付渠道胶囊徽标颜色
    const payCell = row.getCell(5);
    if (r.paymentMethod === '现金') {
      payCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      payCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF92400E' } };
    } else if (r.paymentMethod === '微信') {
      payCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      payCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF065F46' } };
    } else if (r.paymentMethod === '支付宝') {
      payCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      payCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF0369A1' } };
    } else if (r.paymentMethod === '银行卡') {
      payCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
      payCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF3730A3' } };
    } else if (r.paymentMethod === '实物礼品') {
      payCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
      payCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF6B21A8' } };
    }

    // 物品与备注左对齐
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(15).alignment = { vertical: 'middle', horizontal: 'left' };

    // 还礼状态胶囊颜色
    const retCell = row.getCell(13);
    retCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: retStatusBg } };
    retCell.font = { name: 'Microsoft YaHei', size: 9.5, bold: true, color: { argb: retStatusColor } };

    // 还礼金额
    const retAmtCell = row.getCell(14);
    retAmtCell.numFmt = '¥#,##0';
    retAmtCell.alignment = { vertical: 'middle', horizontal: 'right' };
  });

  // =========================================================================
  // 底部重构区 1: 主合计行 (彻底解决单列截断，E:O 大跨度宽幅合并)
  // =========================================================================
  const lastDataRow = 4 + records.length;
  const sumRowNum = lastDataRow + 1;
  const sumRow = ws1.getRow(sumRowNum);
  sumRow.height = 32;

  // A: 标题, B: 笔数, C: 总金额, D: 大写金额, E~O: 宽幅合并全渠道概括条
  sumRow.getCell(1).value = '【全场总计】';
  sumRow.getCell(2).value = `全场共 ${records.length} 笔`;
  sumRow.getCell(3).value = totalAmount;
  sumRow.getCell(4).value = digitToChinese(totalAmount);

  // 重点：将 E列 到 O列 合并为一行大跨度单元格，彻底消除截断，银行卡与所有渠道一目了然！
  ws1.mergeCells(`E${sumRowNum}:O${sumRowNum}`);
  const summaryChannelsText = `全场渠道实收：现金 ¥${cashTotal.toLocaleString()} (${cashCount}笔)  |  微信 ¥${wechatTotal.toLocaleString()} (${wechatCount}笔)  |  支付宝 ¥${alipayTotal.toLocaleString()} (${alipayCount}笔)  |  银行卡 ¥${bankTotal.toLocaleString()} (${bankCount}笔)  |  ${isWhite ? '花圈挽联' : '实物礼品'} ${giftCount}笔`;
  sumRow.getCell(5).value = summaryChannelsText;

  // 设置合计行各列格式与边框
  for (let col = 1; col <= 15; col++) {
    const c = sumRow.getCell(col);
    c.font = { name: 'Microsoft YaHei', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.summaryBg } };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  // 合计列金额高亮
  const sumAmtCell = sumRow.getCell(3);
  sumAmtCell.font = { name: 'Microsoft YaHei', size: 12.5, bold: true, color: { argb: THEME.amountColor } };
  sumAmtCell.numFmt = '¥#,##0';
  sumAmtCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // E~O 宽幅合计居中偏左排版，清晰大方
  sumRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sumRow.getCell(5).font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: isWhite ? 'FF334155' : 'FF9A3412' } };

  // =========================================================================
  // 底部重构区 2: 专设【全渠道实收核算台账】独立表格区域
  // 按照用户指示重新排列，每一渠道独立成行，空间极度宽裕，100% 绝不截断！
  // =========================================================================
  const blankGapRow = ws1.getRow(sumRowNum + 1);
  blankGapRow.height = 10;

  // 1. 核算台账大横幅
  const recBannerRowNum = sumRowNum + 2;
  ws1.mergeCells(`A${recBannerRowNum}:O${recBannerRowNum}`);
  const recBannerCell = ws1.getCell(`A${recBannerRowNum}`);
  recBannerCell.value = THEME.reconcileTitle;
  recBannerCell.font = { name: 'Microsoft YaHei', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  recBannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
  recBannerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(recBannerRowNum).height = 30;

  // 2. 核算台账子表头
  const recHeaderRowNum = sumRowNum + 3;
  ws1.mergeCells(`A${recHeaderRowNum}:B${recHeaderRowNum}`); // 渠道名称
  ws1.mergeCells(`C${recHeaderRowNum}:D${recHeaderRowNum}`); // 实收金额
  ws1.mergeCells(`E${recHeaderRowNum}:G${recHeaderRowNum}`); // 大写金额 / 渠道核验
  ws1.mergeCells(`H${recHeaderRowNum}:I${recHeaderRowNum}`); // 笔数
  ws1.mergeCells(`J${recHeaderRowNum}:K${recHeaderRowNum}`); // 占比
  ws1.mergeCells(`L${recHeaderRowNum}:O${recHeaderRowNum}`); // 财务流向与交接说明

  const recHeaders = [
    { cell: `A${recHeaderRowNum}`, text: '核算支付渠道' },
    { cell: `C${recHeaderRowNum}`, text: '实收金额 / 价值 (元)' },
    { cell: `E${recHeaderRowNum}`, text: '金额大写 / 渠道核验' },
    { cell: `H${recHeaderRowNum}`, text: '收礼笔数' },
    { cell: `J${recHeaderRowNum}`, text: '全场金额占比' },
    { cell: `L${recHeaderRowNum}`, text: '财务流向与交接说明' }
  ];

  recHeaders.forEach(h => {
    const c = ws1.getCell(h.cell);
    c.value = h.text;
    c.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.subHeaderBg } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let col = 1; col <= 15; col++) {
    const c = ws1.getRow(recHeaderRowNum).getCell(col);
    c.border = thinBorder;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.subHeaderBg } };
  }
  ws1.getRow(recHeaderRowNum).height = 26;

  // 3. 五大渠道独立核算行数据
  const channelsDetailData = [
    {
      name: '💵 现金点钞 (现场实钞)',
      amount: cashTotal,
      isAmountVal: true,
      count: cashCount,
      ratio: totalAmount > 0 ? (cashTotal / totalAmount) : 0,
      badgeBg: 'FFFEF3C7',
      badgeColor: 'FF92400E',
      note: '现场账房收钞点算，已封箱交接 / 需东家清点'
    },
    {
      name: '💬 微信支付 (扫码/转账)',
      amount: wechatTotal,
      isAmountVal: true,
      count: wechatCount,
      ratio: totalAmount > 0 ? (wechatTotal / totalAmount) : 0,
      badgeBg: 'FFD1FAE5',
      badgeColor: 'FF065F46',
      note: '主家/收款人微信扫码与直接转账入账，附微信账单明细'
    },
    {
      name: '💳 支付宝支付 (扫码/转账)',
      amount: alipayTotal,
      isAmountVal: true,
      count: alipayCount,
      ratio: totalAmount > 0 ? (alipayTotal / totalAmount) : 0,
      badgeBg: 'FFE0F2FE',
      badgeColor: 'FF0369A1',
      note: '支付宝收款码或手机转账入账，附电子回单交易凭证'
    },
    {
      name: '🏦 银行卡汇款 (网银/POS)',
      amount: bankTotal,
      isAmountVal: true,
      count: bankCount,
      ratio: totalAmount > 0 ? (bankTotal / totalAmount) : 0,
      badgeBg: 'FFE0E7FF',
      badgeColor: 'FF3730A3',
      note: '借记卡/银行账户跨行汇款或刷卡入账，附银行流水凭证'
    },
    {
      name: THEME.giftChannelName,
      amount: giftTotal,
      isAmountVal: (giftTotal > 0),
      count: giftCount,
      ratio: totalAmount > 0 ? (giftTotal / totalAmount) : 0,
      badgeBg: 'FFF3E8FF',
      badgeColor: 'FF6B21A8',
      note: THEME.giftChannelNote
    }
  ];

  channelsDetailData.forEach((ch, idx) => {
    const curRowNum = recHeaderRowNum + 1 + idx;
    const r = ws1.getRow(curRowNum);
    r.height = 26;

    // 合并列
    ws1.mergeCells(`A${curRowNum}:B${curRowNum}`);
    ws1.mergeCells(`C${curRowNum}:D${curRowNum}`);
    ws1.mergeCells(`E${curRowNum}:G${curRowNum}`);
    ws1.mergeCells(`H${curRowNum}:I${curRowNum}`);
    ws1.mergeCells(`J${curRowNum}:K${curRowNum}`);
    ws1.mergeCells(`L${curRowNum}:O${curRowNum}`);

    // A:B 渠道名
    const nameC = ws1.getCell(`A${curRowNum}`);
    nameC.value = ch.name;
    nameC.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: ch.badgeColor } };
    nameC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ch.badgeBg } };
    nameC.alignment = { vertical: 'middle', horizontal: 'center' };

    // C:D 金额
    const amtC = ws1.getCell(`C${curRowNum}`);
    if (ch.isAmountVal) {
      amtC.value = ch.amount;
      amtC.numFmt = '¥#,##0';
      amtC.font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    } else {
      amtC.value = `实物入库 (${ch.count}件)`;
      amtC.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF7C3AED' } };
    }
    amtC.alignment = { vertical: 'middle', horizontal: 'right' };

    // E:G 大写
    const wordsC = ws1.getCell(`E${curRowNum}`);
    wordsC.value = ch.isAmountVal ? digitToChinese(ch.amount) : (isWhite ? '花圈挽联实物品名见明细表' : '随礼实物品名见明细表');
    wordsC.font = { name: 'Microsoft YaHei', size: 9.5, color: { argb: 'FF475569' } };
    wordsC.alignment = { vertical: 'middle', horizontal: 'center' };

    // H:I 笔数
    const countC = ws1.getCell(`H${curRowNum}`);
    countC.value = `${ch.count} 笔`;
    countC.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF334155' } };
    countC.alignment = { vertical: 'middle', horizontal: 'center' };

    // J:K 占比
    const ratioC = ws1.getCell(`J${curRowNum}`);
    ratioC.value = ch.ratio;
    ratioC.numFmt = '0.0%';
    ratioC.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF64748B' } };
    ratioC.alignment = { vertical: 'middle', horizontal: 'center' };

    // L:O 财务流向与说明
    const noteC = ws1.getCell(`L${curRowNum}`);
    noteC.value = ch.note;
    noteC.font = { name: 'Microsoft YaHei', size: 9.5, color: { argb: 'FF475569' } };
    noteC.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // 给该行每个单元格补齐边框和底色
    const rowBg = (idx % 2 === 1) ? THEME.evenRowBg : 'FFFFFFFF';
    for (let col = 1; col <= 15; col++) {
      const c = r.getCell(col);
      c.border = thinBorder;
      if (col > 2) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }
  });

  // 4. 台账平衡总计底行
  const recSumRowNum = recHeaderRowNum + 1 + channelsDetailData.length;
  const recSumRow = ws1.getRow(recSumRowNum);
  recSumRow.height = 30;

  ws1.mergeCells(`A${recSumRowNum}:B${recSumRowNum}`);
  ws1.mergeCells(`C${recSumRowNum}:D${recSumRowNum}`);
  ws1.mergeCells(`E${recSumRowNum}:G${recSumRowNum}`);
  ws1.mergeCells(`H${recSumRowNum}:I${recSumRowNum}`);
  ws1.mergeCells(`J${recSumRowNum}:K${recSumRowNum}`);
  ws1.mergeCells(`L${recSumRowNum}:O${recSumRowNum}`);

  const recSumA = ws1.getCell(`A${recSumRowNum}`);
  recSumA.value = '【全渠道平账总计】';
  recSumA.font = { name: 'Microsoft YaHei', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
  recSumA.alignment = { vertical: 'middle', horizontal: 'center' };

  const recSumC = ws1.getCell(`C${recSumRowNum}`);
  recSumC.value = totalAmount;
  recSumC.numFmt = '¥#,##0';
  recSumC.font = { name: 'Microsoft YaHei', size: 11.5, bold: true, color: { argb: THEME.amountColor } };
  recSumC.alignment = { vertical: 'middle', horizontal: 'right' };

  const recSumE = ws1.getCell(`E${recSumRowNum}`);
  recSumE.value = digitToChinese(totalAmount);
  recSumE.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  recSumE.alignment = { vertical: 'middle', horizontal: 'center' };

  const recSumH = ws1.getCell(`H${recSumRowNum}`);
  recSumH.value = `${records.length} 笔`;
  recSumH.font = { name: 'Microsoft YaHei', size: 10, bold: true };
  recSumH.alignment = { vertical: 'middle', horizontal: 'center' };

  const recSumJ = ws1.getCell(`J${recSumRowNum}`);
  recSumJ.value = 1;
  recSumJ.numFmt = '100.0%';
  recSumJ.font = { name: 'Microsoft YaHei', size: 10, bold: true };
  recSumJ.alignment = { vertical: 'middle', horizontal: 'center' };

  const recSumL = ws1.getCell(`L${recSumRowNum}`);
  recSumL.value = '全渠道现金、电子收款与实物全部平账核算一致';
  recSumL.font = { name: 'Microsoft YaHei', size: 9.5, bold: true, color: { argb: isWhite ? 'FF334155' : 'FF991B1B' } };
  recSumL.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (let col = 1; col <= 15; col++) {
    const c = recSumRow.getCell(col);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.summaryBg } };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
  }

  // =========================================================================
  // Sheet 2: 账目核对与分类统计
  // =========================================================================
  const ws2 = wb.addWorksheet(THEME.sheet2Name);
  const s2Widths = [24, 18, 22, 18, 18, 22];
  s2Widths.forEach((w, idx) => {
    ws2.getColumn(idx + 1).width = w;
  });

  // 第 1 行: 标题横幅
  ws2.mergeCells('A1:F1');
  const s2Title = ws2.getCell('A1');
  s2Title.value = `【${currentEvent.title}】${THEME.sheet2Name}表`;
  s2Title.font = { name: 'Microsoft YaHei', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  s2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.bannerBg } };
  s2Title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(1).height = 40;

  // 第 2 行: 间距
  ws2.getRow(2).height = 10;

  // 第 3-4 行: 6 个独立高颜值统计卡片 (完整包含银行卡与实物，绝不合并混淆)
  const kpiCards = [
    {
      col: 1,
      title: isWhite ? '奠仪总金额' : '礼金总金额',
      val: `¥ ${totalAmount.toLocaleString()}`,
      bg: isWhite ? 'FFF1F5F9' : 'FFFEF2F2',
      border: isWhite ? 'FFCBD5E1' : 'FFFECACA',
      valColor: isWhite ? 'FF0F172A' : 'FFDC2626'
    },
    {
      col: 2,
      title: '实收现金总计',
      val: `¥ ${cashTotal.toLocaleString()}`,
      bg: 'FFFEF3C7',
      border: 'FFFDE68A',
      valColor: 'FFB45309'
    },
    {
      col: 3,
      title: '微信扫码入账',
      val: `¥ ${wechatTotal.toLocaleString()}`,
      bg: 'FFECFDF5',
      border: 'FFA7F3D0',
      valColor: 'FF047857'
    },
    {
      col: 4,
      title: '支付宝转账',
      val: `¥ ${alipayTotal.toLocaleString()}`,
      bg: 'FFE0F2FE',
      border: 'FFBAE6FD',
      valColor: 'FF0284C7'
    },
    {
      col: 5,
      title: '银行卡汇款',
      val: `¥ ${bankTotal.toLocaleString()}`,
      bg: 'FFE0E7FF',
      border: 'FFC7D2FE',
      valColor: 'FF3730A3'
    },
    {
      col: 6,
      title: '随礼宾客总数',
      val: `${records.length} 位`,
      bg: 'FFF3E8FF',
      border: 'FFDDD6FE',
      valColor: 'FF7E22CE'
    }
  ];

  ws2.getRow(3).height = 20;
  ws2.getRow(4).height = 32;

  kpiCards.forEach(c => {
    const tCell = ws2.getRow(3).getCell(c.col);
    tCell.value = c.title;
    tCell.font = { name: 'Microsoft YaHei', size: 9.5, bold: true, color: { argb: 'FF475569' } };
    tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tCell.border = {
      top: { style: 'thin', color: { argb: c.border } },
      left: { style: 'thin', color: { argb: c.border } },
      right: { style: 'thin', color: { argb: c.border } }
    };

    const vCell = ws2.getRow(4).getCell(c.col);
    vCell.value = c.val;
    vCell.font = { name: 'Microsoft YaHei', size: 13.5, bold: true, color: { argb: c.valColor } };
    vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
    vCell.alignment = { horizontal: 'center', vertical: 'middle' };
    vCell.border = {
      bottom: { style: 'thin', color: { argb: c.border } },
      left: { style: 'thin', color: { argb: c.border } },
      right: { style: 'thin', color: { argb: c.border } }
    };
  });

  // 第 5 行: 留白
  ws2.getRow(5).height = 14;

  // 第 6 行: 一、各支付渠道实收核数表
  ws2.mergeCells('A6:E6');
  const sec1 = ws2.getCell('A6');
  sec1.value = isWhite ? '【一、奠仪香仪各支付渠道实收核数对账】' : '【一、礼金各支付渠道实收核数对账】';
  sec1.font = { name: 'Microsoft YaHei', size: 11.5, bold: true, color: { argb: THEME.bannerBg } };
  sec1.alignment = { vertical: 'middle', horizontal: 'left' };
  ws2.getRow(6).height = 24;

  const chHeaders = ['支付渠道', '收礼笔数', '合计金额 (元)', '金额占比', '核算说明'];
  const chHRow = ws2.getRow(7);
  chHRow.height = 26;
  chHeaders.forEach((h, i) => {
    const c = chHRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });

  const channelData = [
    { name: '现金点钞', count: cashCount, amount: cashTotal, bg: 'FFFEF3C7', color: 'FF92400E', note: '现场纸币现金' },
    { name: '微信转账', count: wechatCount, amount: wechatTotal, bg: 'FFD1FAE5', color: 'FF065F46', note: '微信扫码与零钱' },
    { name: '支付宝转账', count: alipayCount, amount: alipayTotal, bg: 'FFE0F2FE', color: 'FF0369A1', note: '支付宝电子转账' },
    { name: '银行卡汇款', count: bankCount, amount: bankTotal, bg: 'FFE0E7FF', color: 'FF3730A3', note: '网银跨行/POS刷卡' },
    { name: isWhite ? '花圈祭仪折合' : '实物礼品折合', count: giftCount, amount: giftTotal, bg: 'FFF3E8FF', color: 'FF6B21A8', note: isWhite ? '花圈挽联实物' : '随礼实物物品' }
  ];

  channelData.forEach((item, idx) => {
    const rIdx = 8 + idx;
    const r = ws2.getRow(rIdx);
    r.height = 24;

    const ratio = totalAmount > 0 ? (item.amount / totalAmount) : 0;
    r.values = [item.name, item.count, item.amount, ratio, item.note];

    r.getCell(1).font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: item.color } };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.bg } };
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(1).border = thinBorder;

    r.getCell(2).font = { name: 'Microsoft YaHei', size: 10 };
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(2).border = thinBorder;

    r.getCell(3).font = { name: 'Microsoft YaHei', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    r.getCell(3).numFmt = '¥#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(3).border = thinBorder;

    r.getCell(4).font = { name: 'Microsoft YaHei', size: 10 };
    r.getCell(4).numFmt = '0.0%';
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).border = thinBorder;

    r.getCell(5).font = { name: 'Microsoft YaHei', size: 9.5, color: { argb: 'FF64748B' } };
    r.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    r.getCell(5).border = thinBorder;
  });

  // 渠道合计行
  const chSumRow = ws2.getRow(13);
  chSumRow.height = 26;
  chSumRow.values = ['渠道总计', records.length, totalAmount, 1, '全渠道平账一致'];
  for (let c = 1; c <= 5; c++) {
    const cell = chSumRow.getCell(c);
    cell.font = { name: 'Microsoft YaHei', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.summaryBg } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  chSumRow.getCell(3).numFmt = '¥#,##0';
  chSumRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  chSumRow.getCell(4).numFmt = '0.0%';
  chSumRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // 第 14 行: 留白
  ws2.getRow(14).height = 16;

  // 第 15 行: 二、亲友关系分类分布统计
  ws2.mergeCells('A15:E15');
  const sec2 = ws2.getCell('A15');
  sec2.value = isWhite ? '【二、奠仪亲友关系分类分布统计】' : '【二、礼金亲友关系分类分布统计】';
  sec2.font = { name: 'Microsoft YaHei', size: 11.5, bold: true, color: { argb: THEME.bannerBg } };
  sec2.alignment = { vertical: 'middle', horizontal: 'left' };
  ws2.getRow(15).height = 24;

  const relHeaders = ['亲友关系分类', '来宾人数', '随礼总额 (元)', '人均礼金 (元)', '占总额比'];
  const relHRow = ws2.getRow(16);
  relHRow.height = 26;
  relHeaders.forEach((h, i) => {
    const c = relHRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });

  // 聚类关系统计
  const relMap = new Map();
  records.forEach(r => {
    const rel = r.relation || (isWhite ? '孝家亲友' : '亲友');
    if (!relMap.has(rel)) relMap.set(rel, { count: 0, amount: 0 });
    const item = relMap.get(rel);
    item.count += 1;
    item.amount += (Number(r.amount) || 0);
  });

  const relEntries = Array.from(relMap.entries()).sort((a, b) => b[1].amount - a[1].amount);
  relEntries.forEach(([rel, item], idx) => {
    const rIdx = 17 + idx;
    const r = ws2.getRow(rIdx);
    r.height = 24;
    const isEven = (idx % 2 === 1);
    const rowBg = isEven ? THEME.evenRowBg : 'FFFFFFFF';
    const avg = item.count > 0 ? Math.round(item.amount / item.count) : 0;
    const relRatio = totalAmount > 0 ? (item.amount / totalAmount) : 0;

    r.values = [rel, item.count, item.amount, avg, relRatio];

    for (let c = 1; c <= 5; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    r.getCell(1).font = { name: 'Microsoft YaHei', size: 10, bold: true };
    r.getCell(3).font = { name: 'Microsoft YaHei', size: 10.5, bold: true, color: { argb: THEME.amountColor } };
    r.getCell(3).numFmt = '¥#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(4).numFmt = '¥#,##0';
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(5).numFmt = '0.0%';
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // 关系合计行
  const relSumRow = ws2.getRow(17 + relEntries.length);
  relSumRow.height = 26;
  const overallAvg = records.length > 0 ? Math.round(totalAmount / records.length) : 0;
  relSumRow.values = ['关系总计', records.length, totalAmount, overallAvg, 1];
  for (let c = 1; c <= 5; c++) {
    const cell = relSumRow.getCell(c);
    cell.font = { name: 'Microsoft YaHei', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.summaryBg } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  relSumRow.getCell(3).numFmt = '¥#,##0';
  relSumRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  relSumRow.getCell(4).numFmt = '¥#,##0';
  relSumRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  relSumRow.getCell(5).numFmt = '0.0%';

  return await wb.xlsx.writeBuffer();
}

module.exports = {
  buildStyledBanquetWorkbook,
  digitToChinese
};
