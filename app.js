const toast = document.querySelector("[data-toast]");
const shell = document.querySelector(".shell");
const sidebarButtons = document.querySelectorAll("[data-sidebar-toggle]");
const sidebarCloseButtons = document.querySelectorAll("[data-sidebar-close]");
const sidebarStorageKey = "femMvpSidebarCollapsed";

function readSidebarPreference() {
  try {
    return window.localStorage.getItem(sidebarStorageKey);
  } catch {
    return null;
  }
}

function writeSidebarPreference(collapsed) {
  try {
    window.localStorage.setItem(sidebarStorageKey, String(collapsed));
  } catch {
    // Local files may be opened in browsers with restricted storage.
  }
}

function setSidebarCollapsed(collapsed, persist = true) {
  if (!shell) return;
  shell.classList.toggle("is-sidebar-collapsed", collapsed);
  sidebarButtons.forEach((button) => {
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? "Открыть боковое меню" : "Скрыть боковое меню");
  });
  if (persist) writeSidebarPreference(collapsed);
}

if (shell && sidebarButtons.length) {
  const savedSidebar = readSidebarPreference();
  const shouldCollapse = savedSidebar === null ? true : savedSidebar === "true";

  setSidebarCollapsed(shouldCollapse, false);

  sidebarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSidebarCollapsed(!shell.classList.contains("is-sidebar-collapsed"));
    });
  });

  sidebarCloseButtons.forEach((button) => {
    button.addEventListener("click", () => setSidebarCollapsed(true));
  });

  document.querySelectorAll(".side .nav a").forEach((link) => {
    link.addEventListener("click", () => setSidebarCollapsed(true));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !shell.classList.contains("is-sidebar-collapsed")) {
      setSidebarCollapsed(true);
    }
  });
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copyTarget);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      showToast("Промт скопирован в буфер обмена.");
    } catch {
      showToast("Браузер не дал доступ к буферу. Текст можно выделить вручную.");
    }
  });
});

const glossarySearch = document.querySelector("[data-glossary-search]");
const glossaryFilters = document.querySelectorAll("[data-glossary-filter]");
const glossaryItems = document.querySelectorAll("[data-glossary-item]");
const glossaryEmpty = document.querySelector("[data-glossary-empty]");
let activeGlossaryCategory = "all";

function normalizeText(value) {
  return value.toLocaleLowerCase("ru-RU").trim();
}

function applyGlossaryFilter() {
  if (!glossaryItems.length) return;
  const query = normalizeText(glossarySearch?.value || "");
  let visibleCount = 0;

  glossaryItems.forEach((item) => {
    const categoryMatch = activeGlossaryCategory === "all" || item.dataset.category === activeGlossaryCategory;
    const haystack = normalizeText(`${item.textContent} ${item.dataset.terms || ""}`);
    const queryMatch = !query || haystack.includes(query);
    const visible = categoryMatch && queryMatch;
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  if (glossaryEmpty) glossaryEmpty.hidden = visibleCount !== 0;
}

glossarySearch?.addEventListener("input", applyGlossaryFilter);

glossaryFilters.forEach((button) => {
  button.addEventListener("click", () => {
    activeGlossaryCategory = button.dataset.glossaryFilter || "all";
    glossaryFilters.forEach((item) => item.classList.toggle("is-active", item === button));
    applyGlossaryFilter();
  });
});

const works = [
  {
    id: "268011",
    name: "Елена Барабаш",
    group: "6411",
    module: "Введение в информационные технологии",
    work: "GIMP",
    competence: "ОПК-5",
    source: "gtifem.ru / portfolio",
    level: "Базовый уровень",
    levelCode: 4,
    score: "0,65",
    statement: "ЛКЦ 12",
    brsStudent: "7516",
    column: "493222",
    confidence: "74%",
    review: "Работа выполнена в полном объеме, есть незначительные погрешности в оформлении и структуре пояснения.",
    detail: "ИИ нашел корректную структуру отчета, подтверждение результата скриншотами и базовое владение инструментом. Замечания: часть выводов оформлена кратко, нет явной связи с одной из компетенций.",
    state: "ready"
  },
  {
    id: "267884",
    name: "Сергей Бородинов",
    group: "6412",
    module: "Введение в информационные технологии",
    work: "Отчет по лабораторному практикуму",
    competence: "ОПК-6",
    source: "gtifem.ru / portfolio",
    level: "Пороговый уровень",
    levelCode: 3,
    score: "0,45",
    statement: "ЛБРТ 17-18",
    brsStudent: "7526",
    column: "486249",
    confidence: "68%",
    review: "Есть обязательные элементы, но часть выводов требует уточнения. Рекомендована ручная проверка перед переносом.",
    detail: "Система выделила неполный блок анализа результата и слабое описание примененного метода. Работа допускается к утверждению после быстрой проверки преподавателем.",
    state: "review"
  },
  {
    id: "267883",
    name: "Мария Коваленко",
    group: "6411",
    module: "Введение в информационные технологии",
    work: "Контрольная работа",
    competence: "ОПК-5",
    source: "gtifem.ru / portfolio",
    level: "Продвинутый уровень",
    levelCode: 5,
    score: "0,90",
    statement: "ПРКТ 17",
    brsStudent: "7772",
    column: "492734",
    confidence: "82%",
    review: "Структура и аргументация сильные. Замечания носят локальный характер и не мешают фиксации результата.",
    detail: "ИИ подтвердил полноту ответов, хорошую связность аргументации и отсутствие критических пропусков. Рекомендован быстрый перенос после утверждения.",
    state: "ready"
  },
  {
    id: "267742",
    name: "Илья Соколов",
    group: "6413",
    module: "Информационные технологии в менеджменте",
    work: "Портфолио",
    competence: "ОПК-2",
    source: "gtifem.ru / portfolio",
    level: "Базовый уровень",
    levelCode: 4,
    score: "0,70",
    statement: "ПРКТ 18",
    brsStudent: "7814",
    column: "493418",
    confidence: "76%",
    review: "Работа раскрывает тему, есть небольшие недочеты в оформлении источников.",
    detail: "Выделены сильные стороны: структура портфолио, наличие выводов, соответствие теме. Риск: часть иллюстраций не подписана.",
    state: "ready"
  },
  {
    id: "267701",
    name: "Анна Мельникова",
    group: "6411",
    module: "Введение в информационные технологии",
    work: "Лабораторная работа",
    competence: "ОПК-6",
    source: "gtifem.ru / portfolio",
    level: "Продвинутый уровень",
    levelCode: 5,
    score: "0,95",
    statement: "ЛБРТ 19-20",
    brsStudent: "7902",
    column: "493512",
    confidence: "88%",
    review: "Работа выполнена полно, выводы доказательные, структура аккуратная.",
    detail: "ИИ нашел полное соответствие чек-листу, корректные выводы и хорошую техническую детализацию. Можно переносить пакетно.",
    state: "ready"
  },
  {
    id: "267690",
    name: "Дмитрий Волков",
    group: "6412",
    module: "Цифровая экономика",
    work: "Эссе",
    competence: "ОПК-5",
    source: "gtifem.ru / portfolio",
    level: "Пороговый уровень",
    levelCode: 3,
    score: "0,50",
    statement: "СРТС 4",
    brsStudent: "7921",
    column: "493608",
    confidence: "64%",
    review: "Есть базовое раскрытие темы, но аргументация требует усиления.",
    detail: "ИИ отметил слабую доказательную базу и недостаток примеров. Система предлагает пороговый уровень и ручной просмотр расшифровки.",
    state: "review"
  }
];

const demoRoot = document.querySelector("[data-demo]");
let selectedWork = works[0];
let approved = false;
let columnCreated = false;
let transferred = false;
let signed = false;
let batchCompleted = false;

function renderWorkList() {
  const list = document.querySelector("[data-work-list]");
  if (!list) return;
  list.innerHTML = works.map((work) => `
    <button class="work-item ${work.id === selectedWork.id ? "is-selected" : ""}" data-work-id="${work.id}" type="button">
      <strong>${work.name}</strong>
      <span>${work.group} · ${work.work}</span>
      <span>work_id ${work.id} · ${work.confidence}</span>
    </button>
  `).join("");
}

function renderFastList() {
  const list = document.querySelector("[data-fast-list]");
  if (!list) return;

  list.innerHTML = works.map((work) => {
    const status = batchCompleted ? "Передано" : work.state === "ready" ? "Готово" : "Проверить";
    const statusClass = batchCompleted || work.state === "ready" ? "is-done" : "";
    const statusTitle = batchCompleted ? "Передано в БРС" : work.state === "ready" ? "Готово к утверждению" : "Нужна проверка";
    return `
      <article class="fast-row ${work.id === selectedWork.id ? "is-selected" : ""}" data-fast-row="${work.id}">
        <div class="work-thumb" aria-label="Миниатюра работы">
          <span></span><span></span><span></span>
        </div>
        <div class="fast-main">
          <strong>${work.name}</strong>
          <p>${work.module} · ${work.work}</p>
          <div class="tag-row">
            <span class="tag">${work.group}</span>
            <span class="tag tag--blue">${work.competence}</span>
            <span class="tag tag--amber">${work.confidence}</span>
          </div>
        </div>
        <div class="fast-score">
          <span class="status-pill ${statusClass}" title="${statusTitle}">${status}</span>
          <strong>${work.score}</strong>
          <span>${work.level}</span>
        </div>
        <div class="fast-actions">
          <button class="btn" type="button" data-select-fast="${work.id}">Открыть</button>
          <button class="btn" type="button" data-toggle-detail="${work.id}">Расшифровка</button>
        </div>
        <div class="fast-detail">
          <strong>Расшифровка рекомендации</strong>
          <p>${work.detail}</p>
          <div class="fast-detail-grid">
            <div class="field"><span>Rule Pack</span><strong>vit-mvp-v1</strong></div>
            <div class="field"><span>БРС колонка</span><strong>${batchCompleted ? `i${work.column}` : "создается автоматически"}</strong></div>
            <div class="field"><span>Поле записи</span><strong>grade_${work.brsStudent}_${work.column}</strong></div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function renderDemo() {
  if (!demoRoot) return;
  renderWorkList();
  renderFastList();
  setText("[data-work-name]", selectedWork.name);
  setText("[data-work-id]", selectedWork.id);
  setText("[data-work-group]", selectedWork.group);
  setText("[data-work-module]", selectedWork.module);
  setText("[data-work-type]", selectedWork.work);
  setText("[data-level]", selectedWork.level);
  setText("[data-level-code]", selectedWork.levelCode);
  setText("[data-score]", selectedWork.score);
  setText("[data-statement]", selectedWork.statement);
  setText("[data-confidence]", selectedWork.confidence);
  setText("[data-review]", selectedWork.review);
  setText("[data-source]", selectedWork.source);
  setText("[data-brs-student]", selectedWork.brsStudent);
  setText("[data-column]", selectedWork.column);
  setText("[data-column-state]", columnCreated ? `создана автоматически: i${selectedWork.column}, не заблокирована` : "не создана");
  document.querySelectorAll("[data-step]").forEach((step) => {
    const name = step.dataset.step;
    const done =
      name === "read" ||
      (name === "approve" && approved) ||
      (name === "column" && columnCreated) ||
      (name === "transfer" && transferred) ||
      (name === "sign" && signed);
    step.classList.toggle("is-done", done);
  });
  const approveButton = document.querySelector("[data-approve]");
  const transferButton = document.querySelector("[data-transfer]");
  const signButton = document.querySelector("[data-sign]");
  if (approveButton) approveButton.disabled = approved;
  if (transferButton) transferButton.disabled = !approved || transferred;
  if (signButton) signButton.disabled = !transferred || signed;
}

function approveSelectedWork() {
  approved = true;
  renderDemo();
  appendAudit(`Преподаватель утвердил academic decision по work_id ${selectedWork.id}.`, "green");
  showToast("Academic decision сохранен. Можно создать колонку БРС.");
}

function createColumnAndTransferSelected() {
  columnCreated = true;
  transferred = true;
  renderDemo();
  appendAudit(`BRS Adapter создал незаблокированную колонку ${selectedWork.statement}: eid=i${selectedWork.column}.`, "green");
  appendAudit(`Балл ${selectedWork.score} записан в grade_${selectedWork.brsStudent}_${selectedWork.column}.`, "green");
  showToast("Колонка создана автоматически, балл записан в БРС.");
}

function runBatchTransfer() {
  batchCompleted = true;
  approved = true;
  columnCreated = true;
  transferred = true;
  signed = true;
  renderDemo();
  appendAudit(`Массовый режим: создана незаблокированная колонка пакета "ИИ-Проверка ${new Date().toLocaleDateString("ru-RU")}".`, "green");
  appendAudit(`В БРС отправлено ${works.length} работ: ${works.map((work) => `${work.name} ${work.score}`).join("; ")}.`, "green");
  appendAudit("Преподаватель выполнил быструю общую подпись пакета после проверки расшифровок.", "amber");
  showToast("Пакет работ отправлен в БРС, колонка создана автоматически.");
}

function appendAudit(message, type = "green") {
  const log = document.querySelector("[data-audit]");
  if (!log) return;
  const item = document.createElement("div");
  item.className = `audit-log__item is-${type}`;
  item.textContent = message;
  log.prepend(item);
}

document.addEventListener("click", (event) => {
  const workButton = event.target.closest(".work-item[data-work-id]");
  if (workButton) {
    selectedWork = works.find((work) => work.id === workButton.dataset.workId) || works[0];
    approved = false;
    columnCreated = false;
    transferred = false;
    signed = false;
    renderDemo();
    appendAudit(`Открыта работа ${selectedWork.id}: ${selectedWork.name}.`, "amber");
  }

  if (event.target.closest("[data-approve]")) {
    approveSelectedWork();
  }

  if (event.target.closest("[data-transfer]")) {
    createColumnAndTransferSelected();
  }

  if (event.target.closest("[data-sign]")) {
    signed = true;
    renderDemo();
    appendAudit(`Ведомость ${selectedWork.statement} подписана преподавателем вручную на стороне БРС.`, "green");
    showToast("Финальная подпись остается у преподавателя.");
  }

  const selectFast = event.target.closest("[data-select-fast]");
  if (selectFast) {
    selectedWork = works.find((work) => work.id === selectFast.dataset.selectFast) || works[0];
    approved = false;
    columnCreated = false;
    transferred = false;
    signed = false;
    renderDemo();
    appendAudit(`Из быстрого режима открыта работа ${selectedWork.id}: ${selectedWork.name}.`, "amber");
  }

  const detailButton = event.target.closest("[data-toggle-detail]");
  if (detailButton) {
    const row = document.querySelector(`[data-fast-row="${detailButton.dataset.toggleDetail}"]`);
    row?.classList.toggle("is-open");
  }

  if (event.target.closest("[data-batch-transfer]")) {
    runBatchTransfer();
  }
});

renderDemo();
