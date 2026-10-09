/**
 * 礼金收聘系统 · 账房云枢 (v1.2 全页面内沉浸式弹窗与企业级高可靠版)
 * 1. 彻底淘汰原生 alert / confirm / prompt，全部采用现代毛玻璃页面内 Toast 与模态对话框
 * 2. 交互与动画响应率达到 60fps 硬件加速
 * 3. 页面内修改记录表单，支持实时汉字大写校验
 * 4. 强大的自动备份快照与灾备自愈保护机制
 */

(function () {
  'use strict';

  // 全局响应式状态
  const state = {
    activeTab: 'cashier',
    currentEvent: null,
    eventsList: [],
    records: [],
    contacts: [],
    stats: {
      totalAmount: 0,
      totalCount: 0,
      cashTotal: 0,
      wechatTotal: 0,
      alipayTotal: 0,
      otherTotal: 0,
      avgAmount: 0
    },
    currentPaymentMethod: '现金',
    systemInfo: null,
    audioContext: null
  };

  // 数字转大写汉字（人民币）
  function digitToChinese(num) {
    num = Number(num);
    if (isNaN(num) || num <= 0) return '零元整';
    const fraction = ['角', '分'];
    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = [['元', '万', '亿'], ['', '拾', '佰', '仟']];
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
    return s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
  }

  // ================= 现代页面内 Toast 提示系统 (取代原生 alert) =================
  function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    const iconMap = { success: '✅', warning: '⚠️', error: '❌' };
    toast.innerHTML = `<span>${iconMap[type] || '🔔'}</span><span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  // ================= 页面内确认对话框 (取代原生 confirm) =================
  function customConfirm(title, desc, confirmBtnText = '确认执行', danger = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modalConfirmAction');
      const titleEl = document.getElementById('confirmModalTitle');
      const descEl = document.getElementById('confirmModalDesc');
      const okBtn = document.getElementById('btnConfirmOk');
      const cancelBtn = document.getElementById('btnConfirmCancel');
      const iconEl = document.getElementById('confirmModalIcon');

      titleEl.textContent = title;
      descEl.textContent = desc;
      okBtn.textContent = confirmBtnText;
      okBtn.className = danger ? 'btn-danger' : 'btn-primary';
      iconEl.textContent = danger ? '🗑️' : '⚠️';
      iconEl.style.background = danger ? '#fee2e2' : '#fef3c7';
      iconEl.style.color = danger ? '#ef4444' : '#d97706';

      openModal(modal);

      const cleanup = () => {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        closeModal(modal);
      };

      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // 成功记账轻音效反馈 (Web Audio API)
  function playSuccessSound() {
    try {
      if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = state.audioContext;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // DOM 节点引用缓存
  const dom = {
    body: document.body,
    brandLogo: document.getElementById('brandLogo'),
    navItems: document.querySelectorAll('.nav-item'),
    tabViews: document.querySelectorAll('.tab-view'),
    
    // 顶栏与返回键
    btnBackToCashier: document.getElementById('btnBackToCashier'),
    btnSwitchEventPill: document.getElementById('btnSwitchEventPill'),
    topEventTypeBadge: document.getElementById('topEventTypeBadge'),
    topEventTitle: document.getElementById('topEventTitle'),
    btnToggleThemeMode: document.getElementById('btnToggleThemeMode'),
    themeModeIcon: document.getElementById('themeModeIcon'),
    themeModeText: document.getElementById('themeModeText'),
    btnPrintLedger: document.getElementById('btnPrintLedger'),
    btnExportExcel: document.getElementById('btnExportExcel'),
    btnNewEventQuick: document.getElementById('btnNewEventQuick'),

    // 指标卡片
    statTotalAmount: document.getElementById('statTotalAmount'),
    statTotalCount: document.getElementById('statTotalCount'),
    statAvgAmount: document.getElementById('statAvgAmount'),
    statTables: document.getElementById('statTables'),
    statCashTotal: document.getElementById('statCashTotal'),
    statWechatTotal: document.getElementById('statWechatTotal'),
    statAlipayTotal: document.getElementById('statAlipayTotal'),

    // 收礼台
    cashierPanelTitle: document.getElementById('cashierPanelTitle'),
    cashierForm: document.getElementById('cashierForm'),
    inputGuestName: document.getElementById('inputGuestName'),
    inputAmount: document.getElementById('inputAmount'),
    amountWordsDisplay: document.getElementById('amountWordsDisplay'),
    contactHint: document.getElementById('contactHint'),
    paymentMethodTags: document.getElementById('paymentMethodTags'),
    inputRelation: document.getElementById('inputRelation'),
    inputSeatTable: document.getElementById('inputSeatTable'),
    inputGiftItems: document.getElementById('inputGiftItems'),
    inputNotes: document.getElementById('inputNotes'),
    btnSubmitRecord: document.getElementById('btnSubmitRecord'),
    liveCountLabel: document.getElementById('liveCountLabel'),
    cashierRecentTbody: document.getElementById('cashierRecentTbody'),

    // 流水页
    ledgerSearchInput: document.getElementById('ledgerSearchInput'),
    filterPayment: document.getElementById('filterPayment'),
    filterRelation: document.getElementById('filterRelation'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    fullLedgerTbody: document.getElementById('fullLedgerTbody'),

    // 对账页
    reconcileCashAmount: document.getElementById('reconcileCashAmount'),
    reconcileWechatAmount: document.getElementById('reconcileWechatAmount'),
    reconcileAlipayAmount: document.getElementById('reconcileAlipayAmount'),
    relationStatsContainer: document.getElementById('relationStatsContainer'),

    // 还礼页
    contactSearchInput: document.getElementById('contactSearchInput'),
    contactsTbody: document.getElementById('contactsTbody'),

    // 事项页
    btnCreateEvent: document.getElementById('btnCreateEvent'),
    eventsCardGrid: document.getElementById('eventsCardGrid'),

    // 弹窗
    btnOpenQrModal: document.getElementById('btnOpenQrModal'),
    modalQrCode: document.getElementById('modalQrCode'),
    qrImage: document.getElementById('qrImage'),
    qrUrlText: document.getElementById('qrUrlText'),
    btnCopyQrUrl: document.getElementById('btnCopyQrUrl'),
    ipSelector: document.getElementById('ipSelector'),

    modalSwitchEventQuick: document.getElementById('modalSwitchEventQuick'),
    quickEventListContainer: document.getElementById('quickEventListContainer'),
    btnGoCreateEventFromSwitch: document.getElementById('btnGoCreateEventFromSwitch'),

    modalLedgerPrint: document.getElementById('modalLedgerPrint'),
    printLedgerTitle: document.getElementById('printLedgerTitle'),
    printLedgerDate: document.getElementById('printLedgerDate'),
    printLedgerHost: document.getElementById('printLedgerHost'),
    printLedgerTotal: document.getElementById('printLedgerTotal'),
    printLedgerGrid: document.getElementById('printLedgerGrid'),
    btnDoPrint: document.getElementById('btnDoPrint'),

    btnEditCurrentEventQuick: document.getElementById('btnEditCurrentEventQuick'),
    modalEventEdit: document.getElementById('modalEventEdit'),
    eventForm: document.getElementById('eventForm'),
    eventModalTitle: document.getElementById('eventModalTitle'),
    btnSaveEventSubmit: document.getElementById('btnSaveEventSubmit'),
    evtInputId: document.getElementById('evtInputId'),
    evtInputTitle: document.getElementById('evtInputTitle'),
    evtInputCategory: document.getElementById('evtInputCategory'),
    evtInputDate: document.getElementById('evtInputDate'),
    evtInputHost: document.getElementById('evtInputHost'),
    evtInputTables: document.getElementById('evtInputTables'),
    evtInputLocation: document.getElementById('evtInputLocation'),
    evtInputNotes: document.getElementById('evtInputNotes'),

    modalReturnGift: document.getElementById('modalReturnGift'),
    returnGiftForm: document.getElementById('returnGiftForm'),
    returnRecordId: document.getElementById('returnRecordId'),
    returnGuestNameDisplay: document.getElementById('returnGuestNameDisplay'),
    returnOriginalAmountDisplay: document.getElementById('returnOriginalAmountDisplay'),
    returnEventTitleDisplay: document.getElementById('returnEventTitleDisplay'),
    returnStatusSelect: document.getElementById('returnStatusSelect'),
    returnAmountInput: document.getElementById('returnAmountInput'),
    returnNotesInput: document.getElementById('returnNotesInput'),

    modalEditRecord: document.getElementById('modalEditRecord'),
    editRecordForm: document.getElementById('editRecordForm'),
    editRecordId: document.getElementById('editRecordId'),
    editGuestName: document.getElementById('editGuestName'),
    editAmount: document.getElementById('editAmount'),
    editAmountWordsDisplay: document.getElementById('editAmountWordsDisplay'),
    editPaymentMethod: document.getElementById('editPaymentMethod'),
    editRelation: document.getElementById('editRelation'),
    editSeatTable: document.getElementById('editSeatTable'),
    editNotes: document.getElementById('editNotes')
  };

  // ================= 弹窗通用控制 (页面内沉浸式弹窗，支持点击背景与 ESC 键关闭) =================
  function openModal(el) {
    if (el) el.classList.add('active');
  }
  function closeModal(el) {
    if (el) el.classList.remove('active');
  }
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const target = document.getElementById(modalId);
      closeModal(target);
    });
  });

  // 点击遮罩灰色背景区域快速关闭弹窗
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });

  // 按键盘 Esc 键快速关闭当前所有激活弹窗
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
        closeModal(overlay);
      });
    }
  });

  // ================= 导航切换与内置返回键 =================
  dom.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  function switchTab(tabName) {
    state.activeTab = tabName;
    dom.navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const tabMap = {
      cashier: 'viewCashier',
      ledger: 'viewLedger',
      reconcile: 'viewReconcile',
      reciprocity: 'viewReciprocity',
      events: 'viewEvents'
    };

    dom.tabViews.forEach(view => {
      view.style.display = 'none';
      view.classList.remove('active');
    });

    const activeViewId = tabMap[tabName];
    const activeView = document.getElementById(activeViewId);
    if (activeView) {
      activeView.style.display = 'block';
      activeView.classList.add('active');
    }

    // 内置返回键控制
    if (tabName !== 'cashier') {
      dom.btnBackToCashier.style.display = 'inline-flex';
    } else {
      dom.btnBackToCashier.style.display = 'none';
      dom.inputGuestName.focus();
    }

    if (tabName === 'ledger') {
      renderFullLedgerTable();
    } else if (tabName === 'reconcile') {
      renderReconcileView();
    } else if (tabName === 'reciprocity') {
      loadContactsHistory();
    } else if (tabName === 'events') {
      loadEvents();
    }
  }

  dom.btnBackToCashier.addEventListener('click', () => {
    switchTab('cashier');
  });

  // ================= 风格与主题切换 (红事吉庆 vs 白事追思) =================
  function applyTheme(eventType) {
    const giftBtn = document.getElementById('payMethodGiftBtn');
    const giftIcon = document.getElementById('payMethodGiftIcon');
    const giftText = document.getElementById('payMethodGiftText');
    const giftInput = document.getElementById('inputGiftItems');
    const giftLabel = document.getElementById('labelGiftItems');

    if (eventType === 'white') {
      dom.body.classList.remove('theme-red');
      dom.body.classList.add('theme-white');
      dom.brandLogo.textContent = '奠';
      dom.topEventTypeBadge.textContent = '白事追思';
      dom.themeModeIcon.textContent = '🔴';
      dom.themeModeText.textContent = '切换红事吉庆模式';
      dom.cashierPanelTitle.textContent = '账房奠仪/香仪极速登记台';
      dom.btnSubmitRecord.innerHTML = '<span>💾</span> 登记奠仪 (Enter)';

      // 白事专属：仅显示花圈挽联，不显示实物贺礼
      if (giftIcon) giftIcon.textContent = '💐';
      if (giftText) giftText.textContent = '花圈挽联';
      if (giftBtn) giftBtn.title = '花圈挽联 / 祭仪折合 (免填礼金金额)';
      if (giftLabel) giftLabel.textContent = '花圈挽联 / 祭仪品名 (免填礼金金额)';
      if (giftInput) giftInput.placeholder = '如: 大花圈两个、挽联一副、祭礼纸帛';
    } else {
      dom.body.classList.remove('theme-white');
      dom.body.classList.add('theme-red');
      dom.brandLogo.textContent = '礼';
      dom.topEventTypeBadge.textContent = '红事大吉';
      dom.themeModeIcon.textContent = '⚪';
      dom.themeModeText.textContent = '切换白事追思模式';
      dom.cashierPanelTitle.textContent = '账房极速收礼录入台';
      dom.btnSubmitRecord.innerHTML = '<span>💾</span> 立即记账 (Enter)';

      // 红事专属：仅显示实物礼品，不显示花圈
      if (giftIcon) giftIcon.textContent = '🎁';
      if (giftText) giftText.textContent = '实物礼品';
      if (giftBtn) giftBtn.title = '实物礼品 (如烟酒茶礼、家电金器等，免填金额)';
      if (giftLabel) giftLabel.textContent = '随礼物品 / 贺礼品名 (免填礼金金额)';
      if (giftInput) giftInput.placeholder = '如: 烟酒两箱、金手镯、高档茶礼、家电等';
    }

    // 若当前已选择实物项，联动刷新大写提示文本
    if (state.currentPaymentMethod === '实物礼品') {
      const isWhite = (eventType === 'white');
      dom.amountWordsDisplay.textContent = isWhite ? '💐 花圈祭仪 (免填现金)' : '🎁 实物贺礼 (免填现金)';
    }
  }

  dom.btnToggleThemeMode.addEventListener('click', async () => {
    if (!state.currentEvent) return;
    const newType = state.currentEvent.eventType === 'red' ? 'white' : 'red';
    try {
      const res = await fetch(`/api/events/${state.currentEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: newType })
      });
      if (res.ok) {
        state.currentEvent.eventType = newType;
        applyTheme(newType);
        showToast(`已切换为${newType === 'white' ? '白事追思' : '红事吉庆'}模式`, 'success');
      }
    } catch (e) {
      showToast('切换主题异常', 'error');
    }
  });

  // ================= 支付渠道大尺寸按钮交互与实物免填金额 =================
  function setPaymentMethod(method) {
    state.currentPaymentMethod = method;
    document.querySelectorAll('#paymentMethodTags .pay-channel-btn').forEach(btn => {
      if (btn.dataset.method === method) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const isGift = (method === '实物礼品');
    const isWhite = (state.currentEvent && state.currentEvent.eventType === 'white');

    if (isGift) {
      // 实物礼品/花圈挽联：免填礼金金额
      dom.inputAmount.required = false;
      dom.inputAmount.placeholder = '免填金额 (实物/花圈登记)';
      dom.inputAmount.value = '';
      dom.amountWordsDisplay.textContent = isWhite ? '💐 花圈挽联 (免填现金)' : '🎁 实物贺礼 (免填现金)';
      dom.amountWordsDisplay.style.background = '#faf5ff';
      dom.amountWordsDisplay.style.borderColor = '#c084fc';
      dom.amountWordsDisplay.style.color = '#7e22ce';

      // 自动聚焦引导到随礼物品输入框
      if (dom.inputGiftItems) {
        dom.inputGiftItems.focus();
        dom.inputGiftItems.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.25)';
        setTimeout(() => { dom.inputGiftItems.style.boxShadow = ''; }, 1200);
      }
    } else {
      // 现金 / 微信 / 支付宝等常规支付模式
      dom.inputAmount.required = true;
      dom.inputAmount.placeholder = '如: 800 (回车直接保存)';
      dom.amountWordsDisplay.style.background = '';
      dom.amountWordsDisplay.style.borderColor = '';
      dom.amountWordsDisplay.style.color = '';
      dom.amountWordsDisplay.textContent = digitToChinese(dom.inputAmount.value);
    }
  }

  document.querySelectorAll('#paymentMethodTags .pay-channel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setPaymentMethod(btn.dataset.method);
    });
  });

  // 快捷键 1~5 秒切渠道
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
      const map = { '1': '现金', '2': '微信', '3': '支付宝', '4': '银行卡', '5': '实物礼品' };
      if (map[e.key]) {
        e.preventDefault();
        setPaymentMethod(map[e.key]);
      }
    }
  });

  // ================= 极速收礼台：快捷输入与键盘流转 =================
  dom.inputAmount.addEventListener('input', () => {
    const val = dom.inputAmount.value;
    dom.amountWordsDisplay.textContent = digitToChinese(val);
  });

  document.querySelectorAll('.quick-amt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.inputAmount.value = btn.dataset.amt;
      dom.amountWordsDisplay.textContent = digitToChinese(btn.dataset.amt);
      dom.inputAmount.focus();
    });
  });

  document.querySelectorAll('.rel-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      dom.inputRelation.value = tag.dataset.rel;
    });
  });

  dom.inputGuestName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (dom.inputGuestName.value.trim()) {
        dom.inputAmount.focus();
        dom.inputAmount.select();
      }
    }
  });

  dom.inputGuestName.addEventListener('input', () => {
    const name = dom.inputGuestName.value.trim();
    if (!name) {
      dom.contactHint.textContent = '';
      return;
    }
    const match = state.contacts.find(c => c.guestName === name || c.name === name);
    if (match) {
      dom.contactHint.textContent = `(历史往来: 累计随礼 ¥${match.totalReceived || 0})`;
      if (match.relation) dom.inputRelation.value = match.relation;
    } else {
      dom.contactHint.textContent = '';
    }
  });

  // 提交记账
  dom.cashierForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const guestName = dom.inputGuestName.value.trim();
    const isGift = (state.currentPaymentMethod === '实物礼品');
    const amountVal = dom.inputAmount.value.trim();
    const amount = isGift ? (amountVal ? Math.max(0, Number(amountVal) || 0) : 0) : Number(amountVal);
    const relation = dom.inputRelation.value.trim() || '亲友';
    const seatTable = dom.inputSeatTable.value.trim();
    const giftItems = dom.inputGiftItems.value.trim();
    const notes = dom.inputNotes.value.trim();
    const isWhite = (state.currentEvent && state.currentEvent.eventType === 'white');

    if (!guestName) {
      showToast('请完整填写宾客姓名', 'warning');
      dom.inputGuestName.focus();
      return;
    }

    if (!isGift && (isNaN(amount) || amount <= 0)) {
      showToast('请输入有效礼金金额', 'warning');
      dom.inputAmount.focus();
      return;
    }

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: state.currentEvent ? state.currentEvent.id : undefined,
          guestName,
          amount,
          paymentMethod: state.currentPaymentMethod,
          relation,
          seatTable,
          giftItems,
          notes,
          channel: 'desktop',
          recorder: '电脑主账房'
        })
      });

      if (res.ok) {
        playSuccessSound();
        const giftFallback = isWhite ? '花圈挽联' : '实物礼品';
        showToast(isGift ? `已成功录入：${guestName}【${giftItems || notes || giftFallback}】` : `已成功录入：${guestName} ¥${amount} (${state.currentPaymentMethod})`, 'success');
        dom.inputGuestName.value = '';
        dom.inputAmount.value = '';
        dom.amountWordsDisplay.textContent = isGift ? (isWhite ? '💐 花圈祭仪 (免填现金)' : '🎁 实物贺礼 (免填现金)') : '零元整';
        dom.inputSeatTable.value = '';
        dom.inputGiftItems.value = '';
        dom.inputNotes.value = '';
        dom.contactHint.textContent = '';
        dom.inputGuestName.focus();
        
        await loadRecords(state.currentEvent ? state.currentEvent.id : null);
      } else {
        showToast('保存记录失败，请检查服务状态', 'error');
      }
    } catch (err) {
      showToast('网络连接异常', 'error');
    }
  });

  // ================= 数据加载与渲染 =================
  async function loadRecords(targetEventId) {
    try {
      let url = '/api/records';
      if (targetEventId) {
        url += `?eventId=${targetEventId}`;
      } else if (state.currentEvent && state.currentEvent.id) {
        url += `?eventId=${state.currentEvent.id}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      
      state.currentEvent = data.event;
      state.records = data.records || [];
      state.stats = data.stats || state.stats;

      updateTopBarUI();
      renderStatsCards();
      renderRecentTable();
      renderFullLedgerTable();
      populateRelationFilter();
    } catch (err) {
      console.error('加载记录异常:', err);
    }
  }

  function updateTopBarUI() {
    if (!state.currentEvent) return;
    dom.topEventTitle.textContent = state.currentEvent.title;
    applyTheme(state.currentEvent.eventType);
    dom.statTables.textContent = `预设桌数: ${state.currentEvent.targetTables || 30} 桌`;
  }

  function renderStatsCards() {
    const s = state.stats;
    dom.statTotalAmount.textContent = '¥ ' + (s.totalAmount || 0).toLocaleString();
    dom.statTotalCount.innerHTML = `${s.totalCount || 0} <span style="font-size: 15px; font-weight: normal;">位</span>`;
    dom.statAvgAmount.textContent = `平均每笔: ¥ ${(s.avgAmount || 0).toLocaleString()}`;
    dom.statCashTotal.textContent = '¥ ' + (s.cashTotal || 0).toLocaleString();
    dom.statWechatTotal.textContent = '¥ ' + (s.wechatTotal || 0).toLocaleString();
    dom.statAlipayTotal.textContent = '¥ ' + ((s.alipayTotal || 0) + (s.otherTotal || 0)).toLocaleString();

    dom.reconcileCashAmount.textContent = '¥ ' + (s.cashTotal || 0).toLocaleString();
    dom.reconcileWechatAmount.textContent = '¥ ' + (s.wechatTotal || 0).toLocaleString();
    dom.reconcileAlipayAmount.textContent = '¥ ' + (s.alipayTotal || 0).toLocaleString();
  }

  function renderRecentTable() {
    dom.liveCountLabel.textContent = `已录入 ${state.records.length} 笔`;
    if (state.records.length === 0) {
      dom.cashierRecentTbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 30px;">暂无收礼记录，请在上方录入</td></tr>`;
      return;
    }

    const recent = state.records.slice(0, 15);
    const isWhite = (state.currentEvent && state.currentEvent.eventType === 'white');
    dom.cashierRecentTbody.innerHTML = recent.map((r, i) => `
      <tr>
        <td style="color: #64748b; font-weight: 500;">${i + 1}</td>
        <td>
          <div class="guest-name-cell">
            <span>${r.guestName}</span>
            <span class="channel-tag ${r.channel === 'mobile' ? 'mobile' : ''}">${r.channel === 'mobile' ? '📱 手机' : '💻 电脑'}</span>
          </div>
        </td>
        <td class="amount-cell">${(r.paymentMethod === '实物礼品' && (!r.amount || Number(r.amount) === 0)) ? `<span style="font-size: 13px; color: #7e22ce;">${isWhite ? '💐 花圈祭仪' : '🎁 实物贺礼'}</span>` : `¥ ${Number(r.amount).toLocaleString()}`}</td>
        <td style="font-size: 13px; color: #64748b;">${r.amountInWords || (r.paymentMethod === '实物礼品' ? (isWhite ? '花圈祭仪' : '实物礼品') : '')}</td>
        <td><span class="payment-badge ${r.paymentMethod}">${(r.paymentMethod === '实物礼品') ? (isWhite ? '💐 花圈挽联' : '🎁 实物礼品') : r.paymentMethod}</span></td>
        <td><span style="font-size: 13px;">${r.relation || '亲朋'}</span></td>
        <td style="color: #64748b; font-size: 13px;">${r.seatTable || '-'}</td>
        <td style="color: #64748b; font-size: 13px;">${r.giftItems || r.notes || '-'}</td>
        <td style="font-size: 12px; color: #94a3b8;">${r.recorder || '-'}</td>
        <td style="font-size: 12px; color: #94a3b8;">${new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</td>
        <td>
          <div class="action-btns">
            <button class="btn-ghost action-btn" onclick="window.app.editRecord('${r.id}')">修改</button>
            <button class="btn-ghost action-btn" style="color: #ef4444;" onclick="window.app.deleteRecord('${r.id}')">作废</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderFullLedgerTable() {
    let list = [...state.records];
    const isWhite = (state.currentEvent && state.currentEvent.eventType === 'white');
    const q = dom.ledgerSearchInput ? dom.ledgerSearchInput.value.trim().toLowerCase() : '';
    const pay = dom.filterPayment ? dom.filterPayment.value : '全部';
    const rel = dom.filterRelation ? dom.filterRelation.value : '全部';

    if (q) {
      list = list.filter(r =>
        (r.guestName && r.guestName.toLowerCase().includes(q)) ||
        (r.relation && r.relation.toLowerCase().includes(q)) ||
        (r.seatTable && r.seatTable.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    if (pay !== '全部') list = list.filter(r => r.paymentMethod === pay);
    if (rel !== '全部') list = list.filter(r => r.relation === rel);

    if (list.length === 0) {
      dom.fullLedgerTbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #94a3b8; padding: 40px;">未找到匹配记录</td></tr>`;
      return;
    }

    dom.fullLedgerTbody.innerHTML = list.map((r, i) => `
      <tr>
        <td style="color: #64748b;">${i + 1}</td>
        <td><b>${r.guestName}</b></td>
        <td class="amount-cell">${(r.paymentMethod === '实物礼品' && (!r.amount || Number(r.amount) === 0)) ? `<span style="font-size: 13px; color: #7e22ce;">${isWhite ? '💐 花圈祭仪' : '🎁 实物贺礼'}</span>` : `¥ ${Number(r.amount).toLocaleString()}`}</td>
        <td style="font-size: 13px; color: #64748b;">${r.amountInWords || (r.paymentMethod === '实物礼品' ? (isWhite ? '花圈祭仪' : '实物礼品') : '')}</td>
        <td><span class="payment-badge ${r.paymentMethod}">${(r.paymentMethod === '实物礼品') ? (isWhite ? '💐 花圈挽联' : '🎁 实物礼品') : r.paymentMethod}</span></td>
        <td>${r.relation || '亲朋'}</td>
        <td>${r.seatTable || '-'}</td>
        <td>${r.giftItems || r.notes || '-'}</td>
        <td>
          <span class="status-badge ${r.returnStatus}">
            ${r.returnStatus === 'returned' ? '✅ 已还礼' : (r.returnStatus === 'pending' ? '⏳ 待还' : '无需')}
          </span>
        </td>
        <td style="font-size: 12px; color: #64748b;">${r.recorder || '-'}</td>
        <td style="font-size: 12px; color: #94a3b8;">${new Date(r.createdAt).toLocaleString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</td>
        <td>
          <div class="action-btns">
            <button class="btn-ghost action-btn" onclick="window.app.openReturnModal('${r.id}')">还礼</button>
            <button class="btn-ghost action-btn" onclick="window.app.editRecord('${r.id}')">修改</button>
            <button class="btn-ghost action-btn" style="color: #ef4444;" onclick="window.app.deleteRecord('${r.id}')">作废</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function populateRelationFilter() {
    const rels = new Set(state.records.map(r => r.relation).filter(Boolean));
    const currentVal = dom.filterRelation.value;
    dom.filterRelation.innerHTML = '<option value="全部">全部关系</option>' +
      Array.from(rels).map(rel => `<option value="${rel}">${rel}</option>`).join('');
    if (rels.has(currentVal)) dom.filterRelation.value = currentVal;
  }

  if (dom.ledgerSearchInput) dom.ledgerSearchInput.addEventListener('input', renderFullLedgerTable);
  if (dom.filterPayment) dom.filterPayment.addEventListener('change', renderFullLedgerTable);
  if (dom.filterRelation) dom.filterRelation.addEventListener('change', renderFullLedgerTable);
  if (dom.btnResetFilters) {
    dom.btnResetFilters.addEventListener('click', () => {
      dom.ledgerSearchInput.value = '';
      dom.filterPayment.value = '全部';
      dom.filterRelation.value = '全部';
      renderFullLedgerTable();
    });
  }

  // ================= 账目核数统计 (对账页) =================
  function renderReconcileView() {
    const relMap = {};
    for (const r of state.records) {
      const rel = r.relation || '其他亲友';
      if (!relMap[rel]) relMap[rel] = { count: 0, total: 0 };
      relMap[rel].count++;
      relMap[rel].total += Number(r.amount) || 0;
    }

    const container = dom.relationStatsContainer;
    container.innerHTML = Object.keys(relMap).map(k => `
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600; font-size: 14px;">${k}</span>
          <span style="font-size: 12px; color: var(--text-muted);">${relMap[k].count} 笔</span>
        </div>
        <div style="font-size: 20px; font-weight: 700; color: var(--theme-primary);">
          ¥ ${relMap[k].total.toLocaleString()}
        </div>
      </div>
    `).join('');
  }

  // ================= 还礼人情簿 =================
  async function loadContactsHistory() {
    try {
      const res = await fetch('/api/contacts/history');
      const data = await res.json();
      state.contacts = data.data || [];
      renderContactsTable();
    } catch (e) {
      console.error(e);
    }
  }

  function renderContactsTable() {
    const q = dom.contactSearchInput.value.trim().toLowerCase();
    let list = state.contacts;
    if (q) {
      list = list.filter(c => c.guestName.toLowerCase().includes(q) || (c.relation && c.relation.toLowerCase().includes(q)));
    }

    if (list.length === 0) {
      dom.contactsTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 30px;">暂无亲友往来档案</td></tr>`;
      return;
    }

    dom.contactsTbody.innerHTML = list.map(c => `
      <tr>
        <td><b>${c.guestName}</b></td>
        <td>${c.relation || '亲朋'}</td>
        <td style="font-weight: 700; color: var(--theme-primary);">¥ ${c.totalReceived.toLocaleString()}</td>
        <td>${c.eventCount} 场宴席</td>
        <td>
          <span class="status-badge ${c.pendingReturns > 0 ? 'pending' : 'returned'}">
            ${c.pendingReturns > 0 ? `有 ${c.pendingReturns} 笔待还` : '已结清'}
          </span>
        </td>
        <td style="font-size: 13px; color: #64748b;">
          ${(c.records || []).map(r => `${r.eventTitle} 随礼 ¥${r.amount} (${r.returnStatus === 'returned' ? '已还' : '待还'})`).join('； ')}
        </td>
        <td>
          <button class="btn-ghost action-btn" onclick="window.app.searchContactLedger('${c.guestName}')">查看明细</button>
        </td>
      </tr>
    `).join('');
  }

  if (dom.contactSearchInput) dom.contactSearchInput.addEventListener('input', renderContactsTable);

  // ================= 宴席事项管理与快捷切换 =================
  async function loadEvents() {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      state.eventsList = data.events || [];
      renderEventsGrid();
      renderQuickEventModalList();
    } catch (e) {
      console.error(e);
    }
  }

  // 打开新建宴席弹窗
  function openCreateEventModal() {
    if (dom.evtInputId) dom.evtInputId.value = '';
    if (dom.eventModalTitle) dom.eventModalTitle.textContent = '➕ 新建宴席事项';
    if (dom.btnSaveEventSubmit) dom.btnSaveEventSubmit.textContent = '保存并开启新宴席';
    const radioRed = document.querySelector('input[name="evtTypeRadio"][value="red"]');
    if (radioRed) radioRed.checked = true;
    if (dom.evtInputTitle) dom.evtInputTitle.value = '';
    if (dom.evtInputCategory) dom.evtInputCategory.value = '';
    if (dom.evtInputDate) dom.evtInputDate.value = new Date().toISOString().slice(0, 10);
    if (dom.evtInputHost) dom.evtInputHost.value = '';
    if (dom.evtInputTables) dom.evtInputTables.value = 30;
    if (dom.evtInputLocation) dom.evtInputLocation.value = '';
    if (dom.evtInputNotes) dom.evtInputNotes.value = '';
    openModal(dom.modalEventEdit);
    setTimeout(() => { if (dom.evtInputTitle) dom.evtInputTitle.focus(); }, 100);
  }

  // 打开编辑宴席弹窗
  function openEditEventModal(eventId) {
    const targetId = eventId || (state.currentEvent ? state.currentEvent.id : null);
    const ev = state.eventsList.find(e => e.id === targetId) || state.currentEvent;
    if (!ev) {
      showToast('未找到该宴席信息', 'warning');
      return;
    }
    if (dom.evtInputId) dom.evtInputId.value = ev.id;
    if (dom.eventModalTitle) dom.eventModalTitle.textContent = `✏️ 编辑宴席：${ev.title}`;
    if (dom.btnSaveEventSubmit) dom.btnSaveEventSubmit.textContent = '保存修改';
    const targetRadio = document.querySelector(`input[name="evtTypeRadio"][value="${ev.eventType === 'white' ? 'white' : 'red'}"]`);
    if (targetRadio) targetRadio.checked = true;
    if (dom.evtInputTitle) dom.evtInputTitle.value = ev.title || '';
    if (dom.evtInputCategory) dom.evtInputCategory.value = ev.category || '';
    if (dom.evtInputDate) dom.evtInputDate.value = ev.date || new Date().toISOString().slice(0, 10);
    if (dom.evtInputHost) dom.evtInputHost.value = ev.host || '';
    if (dom.evtInputTables) dom.evtInputTables.value = ev.targetTables || 20;
    if (dom.evtInputLocation) dom.evtInputLocation.value = ev.location || '';
    if (dom.evtInputNotes) dom.evtInputNotes.value = ev.notes || '';
    openModal(dom.modalEventEdit);
    setTimeout(() => { if (dom.evtInputTitle) dom.evtInputTitle.focus(); }, 100);
  }

  function renderEventsGrid() {
    dom.eventsCardGrid.innerHTML = state.eventsList.map(ev => {
      const isCurrent = state.currentEvent && state.currentEvent.id === ev.id;
      return `
        <div style="background: #fff; border-radius: 16px; border: 2px solid ${isCurrent ? 'var(--theme-primary)' : '#e2e8f0'}; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); position: relative;">
          ${isCurrent ? `<span style="position: absolute; top: 14px; right: 14px; background: var(--theme-primary); color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 999px; font-weight: 600;">正在收礼</span>` : ''}
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span class="event-type-badge">${ev.eventType === 'white' ? '白事追思' : '红事吉庆'}</span>
            <span style="font-size: 12px; color: var(--text-muted);">${ev.category || '宴席'}</span>
          </div>
          <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${ev.title}</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">吉日: ${ev.date} · 东家: ${ev.host || '主家'}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 13px;">
            <div>已收礼金: <b style="color: var(--theme-primary);">¥ ${(ev.totalAmount || 0).toLocaleString()}</b> (${ev.recordCount || 0}笔)</div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-ghost btn-sm" onclick="window.app.openEditEvent('${ev.id}')" title="修改宴席基本信息">✏️ 编辑</button>
              ${!isCurrent ? `<button class="btn-primary btn-sm" onclick="window.app.switchActiveEvent('${ev.id}')">切换为此场</button>` : `<span style="color: var(--color-success); font-weight: 600;">当前活跃</span>`}
              <button class="btn-ghost btn-sm" style="color: #ef4444;" onclick="window.app.deleteEvent('${ev.id}')" title="删除此宴席">🗑️ 删除</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderQuickEventModalList() {
    dom.quickEventListContainer.innerHTML = state.eventsList.map(ev => {
      const isCurrent = state.currentEvent && state.currentEvent.id === ev.id;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: ${isCurrent ? 'var(--theme-soft-bg)' : '#fff'}; border: 1.5px solid ${isCurrent ? 'var(--theme-primary)' : '#e2e8f0'}; border-radius: 12px; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="event-type-badge" style="font-size: 11px;">${ev.eventType === 'white' ? '白事' : '红事'}</span>
              <span style="font-weight: 700; font-size: 15px; color: #1e293b;">${ev.title}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              ${ev.date} · 东家: ${ev.host || '主家'} · 已收 ¥${(ev.totalAmount || 0).toLocaleString()} (${ev.recordCount || 0}笔)
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <button class="btn-ghost btn-sm" onclick="window.app.openEditEvent('${ev.id}')" title="修改宴席名称、东家、日期等">✏️ 编辑</button>
            ${isCurrent ? 
              `<span style="color: var(--theme-primary); font-weight: 700; font-size: 13px; padding: 4px 6px;">● 正在收礼</span>` : 
              `<button class="btn-primary btn-sm" onclick="window.app.switchActiveEvent('${ev.id}')">切换并收礼</button>`}
            <button class="btn-ghost btn-sm" style="color: #ef4444;" onclick="window.app.deleteEvent('${ev.id}')" title="删除此宴席">🗑️ 删除</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 快捷切换宴席弹窗
  dom.btnSwitchEventPill.addEventListener('click', () => {
    renderQuickEventModalList();
    openModal(dom.modalSwitchEventQuick);
  });

  // 快捷编辑当前宴席
  if (dom.btnEditCurrentEventQuick) {
    dom.btnEditCurrentEventQuick.addEventListener('click', () => {
      openEditEventModal(state.currentEvent ? state.currentEvent.id : null);
    });
  }

  dom.btnGoCreateEventFromSwitch.addEventListener('click', () => {
    closeModal(dom.modalSwitchEventQuick);
    openCreateEventModal();
  });

  dom.btnNewEventQuick.addEventListener('click', () => openCreateEventModal());
  dom.btnCreateEvent.addEventListener('click', () => openCreateEventModal());

  // 宴席保存（新建或编辑）表单提交
  dom.eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = dom.evtInputId ? dom.evtInputId.value.trim() : '';
    const eventType = document.querySelector('input[name="evtTypeRadio"]:checked').value;
    const title = dom.evtInputTitle.value.trim();
    const category = dom.evtInputCategory.value.trim();
    const date = dom.evtInputDate.value;
    const host = dom.evtInputHost.value.trim();
    const targetTables = Number(dom.evtInputTables.value) || 20;
    const location = dom.evtInputLocation.value.trim();
    const notes = dom.evtInputNotes.value.trim();

    if (!title) {
      showToast('请填写宴席事项名称', 'warning');
      return;
    }

    try {
      if (editId) {
        // 编辑已有宴席
        const res = await fetch(`/api/events/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, title, category, date, host, targetTables, location, notes })
        });
        const updatedEv = await res.json();
        if (res.ok) {
          closeModal(dom.modalEventEdit);
          closeModal(dom.modalSwitchEventQuick);
          showToast(`已成功保存对宴席【${title}】的修改`, 'success');
          await loadEvents();
          if (state.currentEvent && state.currentEvent.id === editId) {
            state.currentEvent = updatedEv;
            renderCurrentEventInfo();
            await loadRecords(editId);
          }
        } else {
          showToast(updatedEv.error || '保存修改失败', 'error');
        }
      } else {
        // 新建全新宴席
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, title, category, date, host, targetTables, location, notes })
        });
        const newEv = await res.json();
        if (res.ok) {
          closeModal(dom.modalEventEdit);
          closeModal(dom.modalSwitchEventQuick);
          dom.eventForm.reset();
          showToast(`已成功新建宴席：${title}`, 'success');
          await loadEvents();
          await loadRecords(newEv.id);
          switchTab('cashier');
        } else {
          showToast(newEv.error || '新建宴席失败', 'error');
        }
      }
    } catch (err) {
      showToast('保存宴席事项异常', 'error');
    }
  });

  // ================= 手机扫码局域网协同 (PNG 高清标准二维码与容灾切换) =================
  async function loadSystemNetworkInfo() {
    try {
      const res = await fetch('/api/system/info');
      state.systemInfo = await res.json();
      
      const sel = dom.ipSelector;
      if (sel && state.systemInfo.ips) {
        sel.innerHTML = state.systemInfo.ips.map(i => `
          <option value="${i.url}">${i.ip} (${i.interface})</option>
        `).join('');
      }

      const firstUrl = (state.systemInfo.ips && state.systemInfo.ips[0]) ? state.systemInfo.ips[0].url : state.systemInfo.primaryUrl;
      renderQrCode(firstUrl);
    } catch (e) {
      console.error('获取系统局域网信息异常:', e);
    }
  }

  function renderQrCode(baseUrl) {
    if (!baseUrl) return;
    const mobileUrl = baseUrl + '/mobile.html';
    if (dom.qrUrlText) {
      dom.qrUrlText.textContent = mobileUrl;
    }
    if (dom.qrImage) {
      dom.qrImage.src = `/api/system/qrcode?url=${encodeURIComponent(mobileUrl)}&t=${Date.now()}`;
    }
  }

  dom.ipSelector.addEventListener('change', () => {
    renderQrCode(dom.ipSelector.value);
  });

  dom.btnOpenQrModal.addEventListener('click', () => {
    if (dom.ipSelector && dom.ipSelector.value) {
      renderQrCode(dom.ipSelector.value);
    } else if (state.systemInfo) {
      renderQrCode(state.systemInfo.primaryUrl);
    }
    openModal(dom.modalQrCode);
  });

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('手机访问网址已复制到剪贴板！', 'success');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      showToast('手机访问网址已复制到剪贴板！', 'success');
    } catch (e) {
      showToast('请直接长按网址进行复制', 'warning');
    }
    document.body.removeChild(input);
  }

  dom.btnCopyQrUrl.addEventListener('click', () => {
    copyTextToClipboard(dom.qrUrlText.textContent);
  });

  // ================= 传统大红账本排版预览与打印 =================
  dom.btnPrintLedger.addEventListener('click', () => {
    if (!state.currentEvent) return;
    const ev = state.currentEvent;
    dom.printLedgerTitle.textContent = ev.eventType === 'white' ? `${ev.title} · 奠仪簿` : `${ev.title} · 贺礼金簿`;
    dom.printLedgerDate.textContent = `日期：${ev.date}`;
    dom.printLedgerHost.textContent = `东家：${ev.host || '主家'}`;
    dom.printLedgerTotal.textContent = `礼金总额：¥ ${state.stats.totalAmount.toLocaleString()} (${digitToChinese(state.stats.totalAmount)})`;

    dom.printLedgerGrid.innerHTML = state.records.map((r, i) => `
      <div class="ledger-item">
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
          <span>第 ${i + 1} 席</span>
          <span>${r.relation || ''}</span>
        </div>
        <div class="ledger-name" style="margin: 4px 0;">${r.guestName}</div>
        <div class="ledger-amount">贺礼：¥ ${r.amount} 元</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${r.amountInWords || ''}</div>
      </div>
    `).join('');

    openModal(dom.modalLedgerPrint);
  });

  dom.btnDoPrint.addEventListener('click', () => {
    window.print();
  });

  // ================= 导出标准 Microsoft Excel 详单 (.xlsx 格式) =================
  dom.btnExportExcel.addEventListener('click', () => {
    if (state.records.length === 0) {
      showToast('当前宴席暂无数据可导出', 'warning');
      return;
    }
    const eventId = state.currentEvent ? state.currentEvent.id : '';
    const evTitle = state.currentEvent ? state.currentEvent.title : '礼金账本';
    showToast(`正在生成并导出【${evTitle}】标准 Excel (.xlsx)...`, 'success');
    window.location.href = `/api/export/excel?eventId=${encodeURIComponent(eventId)}`;
  });

  // ================= 还礼弹窗表单 =================
  dom.returnGiftForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const recordId = dom.returnRecordId.value;
    const returnStatus = dom.returnStatusSelect.value;
    const returnAmount = Number(dom.returnAmountInput.value) || 0;
    const returnNotes = dom.returnNotesInput.value.trim();

    try {
      const res = await fetch('/api/contacts/return-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, returnStatus, returnAmount, returnNotes })
      });
      if (res.ok) {
        closeModal(dom.modalReturnGift);
        showToast('还礼状态已更新！', 'success');
        await loadRecords(state.currentEvent ? state.currentEvent.id : null);
        if (state.activeTab === 'reciprocity') loadContactsHistory();
      }
    } catch (err) {
      showToast('保存还礼记录失败', 'error');
    }
  });

  // ================= 页面内修改礼金明细表单 =================
  dom.editAmount.addEventListener('input', () => {
    dom.editAmountWordsDisplay.textContent = digitToChinese(dom.editAmount.value);
  });

  dom.editRecordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = dom.editRecordId.value;
    const guestName = dom.editGuestName.value.trim();
    const amount = Number(dom.editAmount.value);
    const paymentMethod = dom.editPaymentMethod.value;
    const relation = dom.editRelation.value.trim();
    const seatTable = dom.editSeatTable.value.trim();
    const notes = dom.editNotes.value.trim();

    if (!guestName || isNaN(amount) || amount <= 0) {
      showToast('请完整填写姓名与有效金额', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName, amount, paymentMethod, relation, seatTable, notes })
      });
      if (res.ok) {
        closeModal(dom.modalEditRecord);
        showToast(`已更新【${guestName}】的礼金记录！`, 'success');
        await loadRecords(state.currentEvent ? state.currentEvent.id : null);
      } else {
        showToast('更新记录失败', 'error');
      }
    } catch (err) {
      showToast('网络通信异常', 'error');
    }
  });

  // ================= 全局暴露辅助操作 (彻底杜绝原生弹窗) =================
  window.app = {
    backToCashier() {
      switchTab('cashier');
    },
    async switchActiveEvent(eventId) {
      try {
        const res = await fetch('/api/events/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        });
        const data = await res.json();
        if (res.ok) {
          state.currentEvent = data.event || null;
          await loadRecords(eventId);
          await loadEvents();
          closeModal(dom.modalSwitchEventQuick);
          switchTab('cashier');
          showToast(`已切换至：${data.event?.title}`, 'success');
        } else {
          showToast(data.error || '切换活动失败', 'error');
        }
      } catch (e) {
        showToast('切换活动网络异常', 'error');
      }
    },
    async deleteRecord(recordId) {
      const rec = state.records.find(r => r.id === recordId);
      const name = rec ? rec.guestName : '该条记录';
      const confirmed = await customConfirm(
        '确认作废礼金记录？',
        `确定要作废【${name}】的此笔礼金记录（¥${rec?.amount || 0}）吗？此操作将立即从全场总额中剔除。`,
        '确认作废',
        true
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/records/${recordId}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`已成功作废【${name}】的记录`, 'success');
          await loadRecords(state.currentEvent ? state.currentEvent.id : null);
        }
      } catch (e) {
        showToast('删除记录异常', 'error');
      }
    },
    editRecord(recordId) {
      const rec = state.records.find(r => r.id === recordId);
      if (!rec) return;
      dom.editRecordId.value = rec.id;
      dom.editGuestName.value = rec.guestName;
      dom.editAmount.value = rec.amount;
      dom.editAmountWordsDisplay.textContent = digitToChinese(rec.amount);
      dom.editPaymentMethod.value = rec.paymentMethod;
      dom.editRelation.value = rec.relation || '';
      dom.editSeatTable.value = rec.seatTable || '';
      dom.editNotes.value = rec.giftItems || rec.notes || '';
      openModal(dom.modalEditRecord);
    },
    openReturnModal(recordId) {
      const rec = state.records.find(r => r.id === recordId);
      if (!rec) return;
      dom.returnRecordId.value = rec.id;
      dom.returnGuestNameDisplay.textContent = rec.guestName + ` (${rec.relation || '亲朋'})`;
      dom.returnOriginalAmountDisplay.textContent = `¥ ${rec.amount}`;
      dom.returnEventTitleDisplay.textContent = state.currentEvent ? state.currentEvent.title : '';
      dom.returnStatusSelect.value = rec.returnStatus || 'returned';
      dom.returnAmountInput.value = rec.returnAmount || rec.amount;
      dom.returnNotesInput.value = rec.returnNotes || `已于 ${new Date().toISOString().slice(0, 10)} 还礼`;
      openModal(dom.modalReturnGift);
    },
    searchContactLedger(name) {
      switchTab('ledger');
      dom.ledgerSearchInput.value = name;
      renderFullLedgerTable();
    },
    openEditEvent(eventId) {
      openEditEventModal(eventId);
    },
    openCreateEvent() {
      openCreateEventModal();
    },
    async deleteEvent(eventId) {
      const ev = state.eventsList.find(e => e.id === eventId);
      if (!ev) return;

      const isOnlyOne = state.eventsList.length <= 1;
      const confirmTitle = isOnlyOne ? '确认删除并开启新宴席？' : '确认删除宴席事项？';
      const confirmMsg = isOnlyOne
        ? `【${ev.title}】是当前系统中唯一的一场宴席。\n\n• 如果您想换成自己的宴席，可直接点击【✏️ 编辑】进行修改；\n• 若确认删除，系统将彻底清空并为您开启一场全新空白宴席。\n\n是否确认删除并开启新宴席？`
        : `确定要删除宴席【${ev.title}】吗？\n该宴席下的所有礼金明细记录将被彻底清理，其他宴席的数据不受任何影响。`;

      const confirmed = await customConfirm(
        confirmTitle,
        confirmMsg,
        isOnlyOne ? '确认删除并开启新宴席' : '确认删除',
        true
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          showToast(`已删除宴席：${ev.title}`, 'success');
          await loadEvents();
          if (data.resetToBlank && data.newEvent) {
            // 自动拉起新宴席编辑弹窗
            await loadRecords(data.newEvent.id);
            openEditEventModal(data.newEvent.id);
          } else {
            if (state.currentEvent && state.currentEvent.id === eventId) {
              await loadRecords(data.activeEventId);
            }
          }
        } else {
          showToast(data.error || '删除事项失败', 'error');
        }
      } catch (e) {
        showToast('删除宴席网络异常', 'error');
      }
    }
  };

  // ================= SSE 实时广播多端监听 =================
  function initSSE() {
    try {
      const sse = new EventSource('/api/stream');
      sse.addEventListener('record_added', () => {
        playSuccessSound();
        loadRecords(state.currentEvent ? state.currentEvent.id : null);
      });
      sse.addEventListener('record_updated', () => loadRecords(state.currentEvent ? state.currentEvent.id : null));
      sse.addEventListener('record_deleted', () => loadRecords(state.currentEvent ? state.currentEvent.id : null));
      sse.addEventListener('event_switched', (e) => {
        try {
          const payload = JSON.parse(e.data);
          state.currentEvent = payload.event;
          loadRecords(payload.activeEventId);
          loadEvents();
        } catch (err) {}
      });
      sse.addEventListener('event_created', () => loadEvents());
      sse.addEventListener('event_updated', (e) => {
        try {
          const updated = JSON.parse(e.data);
          if (state.currentEvent && state.currentEvent.id === updated.id) {
            state.currentEvent = updated;
            renderCurrentEventInfo();
          }
          loadEvents();
        } catch (err) {}
      });
      sse.addEventListener('event_deleted', () => {
        loadEvents();
        loadRecords(null);
      });
    } catch (e) {
      console.warn('SSE 监听异常', e);
    }
  }

  // 页面启动
  async function init() {
    dom.evtInputDate.value = new Date().toISOString().slice(0, 10);
    await loadSystemNetworkInfo();
    await loadRecords(null);
    await loadEvents();
    initSSE();
  }

  init();

})();
