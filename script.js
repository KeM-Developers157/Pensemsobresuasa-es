tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#0f172a'
        }
      }
    }
  }
};

const STORAGE_KEY = 'unificador_a4_state';

const state = {
  sourceFiles: [],
  activeSourceId: null,
  elements: [], 
  activeCrop: null,
  sourceZoom: 1.5,
  canvasZoom: 1,
  layoutColumns: 2,
  blockGap: 12,
  pagePadding: 24,
  autoWhiteBg: true
};

/**
 * DOM ELEMENTS
 */
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const sourceImageSelect = document.getElementById('sourceImageSelect');
const pdfPageNav = document.getElementById('pdfPageNav');
const pdfPageInput = document.getElementById('pdfPageInput');
const pdfTotalPagesLabel = document.getElementById('pdfTotalPagesLabel');
const btnPrevPdfPage = document.getElementById('btnPrevPdfPage');
const btnNextPdfPage = document.getElementById('btnNextPdfPage');
const sourceImage = document.getElementById('sourceImage');
const cropWrapper = document.getElementById('cropWrapper');
const cropOverlay = document.getElementById('cropOverlay');
const cropEmptyState = document.getElementById('cropEmptyState');
const cropViewportContainer = document.getElementById('cropViewportContainer');
const btnAddSnippet = document.getElementById('btnAddSnippet');
const btnSetHeader = document.getElementById('btnSetHeader');
const selectionDimensions = document.getElementById('selectionDimensions');

const leftSidebar = document.getElementById('leftSidebar');
const leftResizer = document.getElementById('leftResizer');

const rightSidebar = document.getElementById('rightSidebar');
const btnHideRightSidebar = document.getElementById('btnHideRightSidebar');
const btnShowRightSidebar = document.getElementById('btnShowRightSidebar');

const previewViewport = document.getElementById('previewViewport');
const a4PagesContainer = document.getElementById('a4PagesContainer');

const snippetsList = document.getElementById('snippetsList');
const snippetsEmptyState = document.getElementById('snippetsEmptyState');
const snippetCountBadge = document.getElementById('snippetCountBadge');

const btnCols1 = document.getElementById('btnCols1');
const btnCols2 = document.getElementById('btnCols2');
const gapInput = document.getElementById('gapInput');
const gapValue = document.getElementById('gapValue');
const paddingInput = document.getElementById('paddingInput');
const paddingValue = document.getElementById('paddingValue');
const chkAutoContrast = document.getElementById('chkAutoContrast');

const btnExportPDF = document.getElementById('btnExportPDF');
const btnClearAll = document.getElementById('btnClearAll');
const themeToggle = document.getElementById('themeToggle');

/**
 * PERSISTÊNCIA LOCAL (LOCALSTORAGE)
 */
function saveStateToLocalStorage() {
  try {
    const payload = {
      elements: state.elements,
      layoutColumns: state.layoutColumns,
      blockGap: state.blockGap,
      pagePadding: state.pagePadding,
      autoWhiteBg: state.autoWhiteBg,
      sourceZoom: state.sourceZoom,
      canvasZoom: state.canvasZoom,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Não foi possível salvar no localStorage:', err);
  }
}

function loadStateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (data.elements && Array.isArray(data.elements)) {
      state.elements = data.elements;
    }
    if (data.layoutColumns) state.layoutColumns = data.layoutColumns;
    if (data.blockGap !== undefined) state.blockGap = data.blockGap;
    if (data.pagePadding !== undefined) state.pagePadding = data.pagePadding;
    if (data.autoWhiteBg !== undefined) state.autoWhiteBg = data.autoWhiteBg;
    if (data.sourceZoom) state.sourceZoom = data.sourceZoom;
    if (data.canvasZoom) state.canvasZoom = data.canvasZoom;

    if (data.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (data.theme === 'light') {
      document.documentElement.classList.remove('dark');
    }

    gapInput.value = state.blockGap;
    gapValue.textContent = `${state.blockGap}px`;
    paddingInput.value = state.pagePadding;
    paddingValue.textContent = `${state.pagePadding}px`;
    chkAutoContrast.checked = state.autoWhiteBg;
    
    setColumns(state.layoutColumns);
  } catch (err) {
    console.error('Erro ao carregar estado salvo:', err);
  }
}

/**
 * INITIALIZATION
 */
function init() {
  setupTheme();
  loadStateFromLocalStorage();
  setupEventListeners();
  setupCropInteraction();
  setupSidebarResizer();
  setupScrollZoom();
  renderSnippetsList();
  renderCanvas();
}

function setupTheme() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    saveStateToLocalStorage();
  });
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  toastMsg.textContent = message;
  if (type === 'success') {
    toastIcon.className = 'fa-solid fa-circle-check text-emerald-400 text-base';
  } else if (type === 'error') {
    toastIcon.className = 'fa-solid fa-circle-xmark text-rose-400 text-base';
  } else {
    toastIcon.className = 'fa-solid fa-circle-info text-sky-400 text-base';
  }

  toast.classList.remove('translate-y-10', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
  }, 3000);
}

function setupScrollZoom() {
  cropViewportContainer.addEventListener('wheel', (e) => {
    if (!state.activeSourceId) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    adjustSourceZoom(delta);
  }, { passive: false });

  previewViewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      adjustCanvasZoom(delta);
    }
  }, { passive: false });
}

function setupSidebarResizer() {
  let isResizing = false;

  leftResizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    leftResizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.max(280, Math.min(e.clientX, 800));
    leftSidebar.style.width = `${newWidth}px`;
  });

  window.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      leftResizer.classList.remove('resizing');
      document.body.style.cursor = '';
    }
  });
}

function setupEventListeners() {
  btnHideRightSidebar.addEventListener('click', () => {
    rightSidebar.classList.add('hidden');
    btnShowRightSidebar.classList.remove('hidden');
  });

  btnShowRightSidebar.addEventListener('click', () => {
    rightSidebar.classList.remove('hidden');
    btnShowRightSidebar.classList.add('hidden');
  });

  fileInput.addEventListener('change', handleFileUpload);
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-brand-500'); });
  dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-brand-500'); });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-brand-500');
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });

  sourceImageSelect.addEventListener('change', (e) => switchSourceFile(e.target.value));

  btnPrevPdfPage.addEventListener('click', () => changePdfPage(-1));
  btnNextPdfPage.addEventListener('click', () => changePdfPage(1));

  pdfPageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goToPdfPage(parseInt(pdfPageInput.value));
      pdfPageInput.blur();
    }
  });
  pdfPageInput.addEventListener('change', () => goToPdfPage(parseInt(pdfPageInput.value)));

  document.getElementById('btnZoomInSource').addEventListener('click', () => adjustSourceZoom(0.05));
  document.getElementById('btnZoomOutSource').addEventListener('click', () => adjustSourceZoom(-0.05));

  document.getElementById('btnCanvasZoomIn').addEventListener('click', () => adjustCanvasZoom(0.05));
  document.getElementById('btnCanvasZoomOut').addEventListener('click', () => adjustCanvasZoom(-0.05));

  btnCols1.addEventListener('click', () => setColumns(1));
  btnCols2.addEventListener('click', () => setColumns(2));

  gapInput.addEventListener('input', (e) => {
    state.blockGap = parseInt(e.target.value);
    gapValue.textContent = `${state.blockGap}px`;
    renderCanvas();
    saveStateToLocalStorage();
  });

  paddingInput.addEventListener('input', (e) => {
    state.pagePadding = parseInt(e.target.value);
    paddingValue.textContent = `${state.pagePadding}px`;
    renderCanvas();
    saveStateToLocalStorage();
  });

  chkAutoContrast.addEventListener('change', (e) => {
    state.autoWhiteBg = e.target.checked;
    renderCanvas();
    saveStateToLocalStorage();
  });

  btnAddSnippet.addEventListener('click', createSnippetFromCrop);
  btnSetHeader.addEventListener('click', setHeaderFromCrop);

  btnExportPDF.addEventListener('click', exportAsPDF);

  btnClearAll.addEventListener('click', () => {
    if (confirm('Deseja realmente limpar todos os recortes e arquivos carregados?')) {
      state.sourceFiles = [];
      state.elements = [];
      state.activeSourceId = null;
      state.activeCrop = null;
      localStorage.removeItem(STORAGE_KEY);
      sourceImageSelect.innerHTML = '<option value="">Nenhum arquivo carregado</option>';
      sourceImage.style.display = 'none';
      pdfPageNav.classList.add('hidden');
      cropEmptyState.style.display = 'flex';
      resetCropOverlay();
      renderSnippetsList();
      renderCanvas();
      showToast('Tudo limpo com sucesso.');
    }
  });
}

/**
 * FILE HANDLING
 */
function handleFileUpload(e) {
  if (e.target.files.length) handleFiles(e.target.files);
}

function handleFiles(files) {
  Array.from(files).forEach((file) => {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      loadPdfFile(file);
    } else if (file.type.startsWith('image/')) {
      loadImageFile(file);
    }
  });
}

function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const item = {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'image',
        name: file.name,
        imgElement: img,
        width: img.naturalWidth,
        height: img.naturalHeight
      };

      state.sourceFiles.push(item);
      updateSourceDropdown();
      switchSourceFile(item.id);
      showToast(`Imagem "${file.name}" carregada com sucesso!`);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

async function loadPdfFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const item = {
      id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'pdf',
      name: file.name,
      pdfDoc: pdfDoc,
      pdfPageNum: 1,
      totalPages: pdfDoc.numPages,
      imgElement: new Image(),
      width: 0,
      height: 0
    };

    state.sourceFiles.push(item);
    updateSourceDropdown();
    await renderPdfPageToSource(item, 1);
    switchSourceFile(item.id);
    showToast(`PDF "${file.name}" carregado com sucesso!`);
  } catch (err) {
    console.error("Erro ao ler PDF:", err);
    showToast("Erro ao processar o arquivo PDF.", "error");
  }
}

async function renderPdfPageToSource(pdfItem, pageNum) {
  const page = await pdfItem.pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.5 });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport: viewport }).promise;

  return new Promise((resolve) => {
    pdfItem.imgElement.onload = () => {
      pdfItem.width = viewport.width;
      pdfItem.height = viewport.height;
      pdfItem.pdfPageNum = pageNum;
      resolve();
    };
    pdfItem.imgElement.src = canvas.toDataURL('image/png');
  });
}

async function changePdfPage(delta) {
  const sourceObj = state.sourceFiles.find((f) => f.id === state.activeSourceId);
  if (!sourceObj || sourceObj.type !== 'pdf') return;
  await goToPdfPage(sourceObj.pdfPageNum + delta);
}

async function goToPdfPage(targetPage) {
  const sourceObj = state.sourceFiles.find((f) => f.id === state.activeSourceId);
  if (!sourceObj || sourceObj.type !== 'pdf') return;

  if (isNaN(targetPage) || targetPage < 1) targetPage = 1;
  if (targetPage > sourceObj.totalPages) targetPage = sourceObj.totalPages;

  await renderPdfPageToSource(sourceObj, targetPage);
  pdfPageInput.value = targetPage;
  pdfPageInput.max = sourceObj.totalPages;
  pdfTotalPagesLabel.textContent = sourceObj.totalPages;
  sourceImage.src = sourceObj.imgElement.src;
  resetCropOverlay();
  applySourceZoom();
}

function updateSourceDropdown() {
  sourceImageSelect.innerHTML = '';
  state.sourceFiles.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.id;
    const typeBadge = item.type === 'pdf' ? '[PDF]' : '[IMG]';
    opt.textContent = `${typeBadge} ${item.name}`;
    sourceImageSelect.appendChild(opt);
  });
}

function switchSourceFile(id) {
  const found = state.sourceFiles.find((f) => f.id === id);
  if (!found) return;

  state.activeSourceId = id;
  sourceImageSelect.value = id;
  sourceImage.src = found.imgElement.src;
  sourceImage.style.display = 'block';
  cropEmptyState.style.display = 'none';

  if (found.type === 'pdf') {
    pdfPageNav.classList.remove('hidden');
    pdfPageInput.value = found.pdfPageNum;
    pdfPageInput.max = found.totalPages;
    pdfTotalPagesLabel.textContent = found.totalPages;
  } else {
    pdfPageNav.classList.add('hidden');
  }

  resetCropOverlay();
  applySourceZoom();
}

function adjustSourceZoom(delta) {
  state.sourceZoom = Math.min(Math.max(0.2, state.sourceZoom + delta), 4);
  document.getElementById('sourceZoomLabel').textContent = `${Math.round(state.sourceZoom * 100)}%`;
  applySourceZoom();
  saveStateToLocalStorage();
}

function applySourceZoom() {
  if (!state.activeSourceId) return;
  sourceImage.style.width = `${sourceImage.naturalWidth * state.sourceZoom}px`;
  resetCropOverlay();
}

function adjustCanvasZoom(delta) {
  state.canvasZoom = Math.min(Math.max(0.3, state.canvasZoom + delta), 2);
  document.getElementById('canvasZoomLabel').textContent = `${Math.round(state.canvasZoom * 100)}%`;
  a4PagesContainer.style.transform = `scale(${state.canvasZoom})`;
  a4PagesContainer.style.transformOrigin = 'top center';
  saveStateToLocalStorage();
}

/**
 * CROP TOOL & SELECTION
 */
let isCropping = false;
let startX = 0, startY = 0;

function setupCropInteraction() {
  cropWrapper.addEventListener('mousedown', (e) => {
    if (!state.activeSourceId) return;
    e.preventDefault();
    
    const rect = cropWrapper.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    isCropping = true;
    cropOverlay.classList.remove('hidden');
    updateCropBox(startX, startY, 0, 0);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isCropping) return;

    const rect = cropWrapper.getBoundingClientRect();
    let currentX = e.clientX - rect.left;
    let currentY = e.clientY - rect.top;

    currentX = Math.max(0, Math.min(currentX, rect.width));
    currentY = Math.max(0, Math.min(currentY, rect.height));

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    updateCropBox(x, y, w, h);
  });

  window.addEventListener('mouseup', () => {
    if (isCropping) {
      isCropping = false;
      if (state.activeCrop && (state.activeCrop.w < 10 || state.activeCrop.h < 10)) {
        resetCropOverlay();
      }
    }
  });
}

function updateCropBox(x, y, w, h) {
  cropOverlay.style.left = `${x}px`;
  cropOverlay.style.top = `${y}px`;
  cropOverlay.style.width = `${w}px`;
  cropOverlay.style.height = `${h}px`;

  const scale = state.sourceZoom;
  const realX = Math.round(x / scale);
  const realY = Math.round(y / scale);
  const realW = Math.round(w / scale);
  const realH = Math.round(h / scale);

  state.activeCrop = { x: realX, y: realY, w: realW, h: realH };
  selectionDimensions.textContent = `Área: ${realW} x ${realH} px`;

  if (realW > 10 && realH > 10) {
    btnAddSnippet.disabled = false;
    btnSetHeader.disabled = false;
  } else {
    btnAddSnippet.disabled = true;
    btnSetHeader.disabled = true;
  }
}

function resetCropOverlay() {
  cropOverlay.classList.add('hidden');
  state.activeCrop = null;
  selectionDimensions.textContent = 'Área selecionada: 0 x 0 px';
  btnAddSnippet.disabled = true;
  btnSetHeader.disabled = true;
}

/**
 * EXTRAÇÃO DE CABEÇALHOS E RECORTES
 */
function setHeaderFromCrop() {
  if (!state.activeSourceId || !state.activeCrop) return;
  const sourceObj = state.sourceFiles.find((f) => f.id === state.activeSourceId);
  if (!sourceObj) return;

  const { x, y, w, h } = state.activeCrop;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceObj.imgElement, x, y, w, h, 0, 0, w, h);

  const headerItem = {
    id: 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    type: 'header',
    sourceName: sourceObj.type === 'pdf' ? `${sourceObj.name} (Pág. ${sourceObj.pdfPageNum})` : sourceObj.name,
    dataUrl: canvas.toDataURL('image/png'),
    nativeWidth: w,
    nativeHeight: h
  };

  state.elements.push(headerItem);
  resetCropOverlay();
  renderSnippetsList();
  renderCanvas();
  saveStateToLocalStorage();
  showToast('Cabeçalho adicionado com sucesso!');
}

function createSnippetFromCrop() {
  if (!state.activeSourceId || !state.activeCrop) return;

  const sourceObj = state.sourceFiles.find((f) => f.id === state.activeSourceId);
  if (!sourceObj) return;

  const { x, y, w, h } = state.activeCrop;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceObj.imgElement, x, y, w, h, 0, 0, w, h);

  const snippetsSoFar = state.elements.filter(e => e.type === 'snippet');
  const col1Count = snippetsSoFar.filter(s => s.column === 1).length;
  const col2Count = snippetsSoFar.filter(s => s.column === 2).length;
  const targetColumn = (state.layoutColumns === 2 && col2Count < col1Count) ? 2 : 1;

  const snippetItem = {
    id: 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    type: 'snippet',
    sourceName: sourceObj.type === 'pdf' ? `${sourceObj.name} (Pág. ${sourceObj.pdfPageNum})` : sourceObj.name,
    dataUrl: canvas.toDataURL('image/png'),
    nativeWidth: w,
    nativeHeight: h,
    column: targetColumn
  };

  state.elements.push(snippetItem);
  resetCropOverlay();
  renderSnippetsList();
  renderCanvas();
  saveStateToLocalStorage();

  showToast('Recorte adicionado com sucesso!');
}

function removeElement(id) {
  const idx = state.elements.findIndex(e => e.id === id);
  if (idx !== -1) {
    state.elements.splice(idx, 1);
    renderSnippetsList();
    renderCanvas();
    saveStateToLocalStorage();
    showToast('Item removido.');
  }
}

function moveElementUp(index) {
  if (index > 0) {
    const temp = state.elements[index];
    state.elements[index] = state.elements[index - 1];
    state.elements[index - 1] = temp;
    renderSnippetsList();
    renderCanvas();
    saveStateToLocalStorage();
  }
}

function moveElementDown(index) {
  if (index < state.elements.length - 1) {
    const temp = state.elements[index];
    state.elements[index] = state.elements[index + 1];
    state.elements[index + 1] = temp;
    renderSnippetsList();
    renderCanvas();
    saveStateToLocalStorage();
  }
}

/**
 * RENDER PAINEL DE ELEMENTOS (SIDEBAR DIREITA)
 */
function renderSnippetsList() {
  snippetCountBadge.textContent = `${state.elements.length} item(ns)`;

  if (state.elements.length === 0) {
    snippetsEmptyState.style.display = 'block';
    snippetsList.innerHTML = '';
    snippetsList.appendChild(snippetsEmptyState);
    return;
  }

  snippetsEmptyState.style.display = 'none';
  snippetsList.innerHTML = '';

  state.elements.forEach((el, index) => {
    const card = document.createElement('div');
    const isHeader = el.type === 'header';

    card.className = isHeader 
      ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-3 shadow-sm space-y-2'
      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 shadow-sm space-y-2';

    const isFirst = index === 0;
    const isLast = index === state.elements.length - 1;

    card.innerHTML = `
      <div class="flex items-center justify-between text-xs font-bold ${isHeader ? 'text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-200'}">
        <span class="truncate max-w-[150px] flex items-center">
          <i class="${isHeader ? 'fa-solid fa-heading text-amber-600 mr-1.5' : 'fa-solid fa-scissors text-slate-400 mr-1.5'}"></i>
          ${isHeader ? 'Cabeçalho' : 'Recorte'} #${index + 1}
        </span>
        <span class="text-[10px] opacity-70 font-mono">${el.nativeWidth}x${el.nativeHeight}px</span>
      </div>

      <div class="bg-white dark:bg-slate-800 p-1.5 rounded border overflow-hidden flex justify-center items-center max-h-20">
        <img src="${el.dataUrl}" class="max-h-16 object-contain">
      </div>

      <div class="flex items-center justify-between pt-1 border-t ${isHeader ? 'border-amber-200 dark:border-amber-800' : 'border-slate-100 dark:border-slate-600'} text-xs">
        
        ${!isHeader && state.layoutColumns === 2 ? `
          <div class="flex items-center space-x-1">
            <label class="text-[10px] text-slate-400 font-medium">Coluna:</label>
            <select class="col-selector bg-slate-100 dark:bg-slate-600 text-[10px] font-semibold rounded px-1.5 py-0.5 outline-none">
              <option value="1" ${el.column === 1 ? 'selected' : ''}>Col 1</option>
              <option value="2" ${el.column === 2 ? 'selected' : ''}>Col 2</option>
            </select>
          </div>
        ` : '<div></div>'}

        <div class="flex items-center space-x-1">
          <button class="btn-up p-1.5 text-slate-500 hover:text-brand-600 rounded hover:bg-slate-100 dark:hover:bg-slate-600 ${isFirst ? 'opacity-30' : ''}" ${isFirst ? 'disabled' : ''} title="Subir">
            <i class="fa-solid fa-arrow-up text-xs"></i>
          </button>
          <button class="btn-down p-1.5 text-slate-500 hover:text-brand-600 rounded hover:bg-slate-100 dark:hover:bg-slate-600 ${isLast ? 'opacity-30' : ''}" ${isLast ? 'disabled' : ''} title="Descer">
            <i class="fa-solid fa-arrow-down text-xs"></i>
          </button>
          <button class="btn-del p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 dark:hover:bg-rose-950/40 rounded px-2" title="Excluir">
            <i class="fa-solid fa-trash-can text-[11px]"></i>
          </button>
        </div>
      </div>
    `;

    const colSel = card.querySelector('.col-selector');
    if (colSel) {
      colSel.addEventListener('change', (e) => {
        el.column = parseInt(e.target.value);
        renderCanvas();
        saveStateToLocalStorage();
      });
    }

    const btnUp = card.querySelector('.btn-up');
    if (btnUp && !isFirst) btnUp.addEventListener('click', () => moveElementUp(index));

    const btnDown = card.querySelector('.btn-down');
    if (btnDown && !isLast) btnDown.addEventListener('click', () => moveElementDown(index));

    card.querySelector('.btn-del').addEventListener('click', () => removeElement(el.id));

    snippetsList.appendChild(card);
  });
}

function setColumns(cols) {
  state.layoutColumns = cols;
  if (cols === 1) {
    btnCols1.className = 'px-3 py-1 text-xs font-semibold rounded-md transition bg-white dark:bg-slate-600 text-brand-600 dark:text-slate-100 shadow-sm';
    btnCols2.className = 'px-3 py-1 text-xs font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 transition';
  } else {
    btnCols2.className = 'px-3 py-1 text-xs font-semibold rounded-md transition bg-white dark:bg-slate-600 text-brand-600 dark:text-slate-100 shadow-sm';
    btnCols1.className = 'px-3 py-1 text-xs font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 transition';
  }
  renderSnippetsList();
  renderCanvas();
  saveStateToLocalStorage();
}

/**
 * RENDERIZAÇÃO DE PÁGINAS A4 (DINÂMICA)
 */
function renderCanvas() {
  a4PagesContainer.innerHTML = '';

  if (state.elements.length === 0) {
    const emptyPage = document.createElement('div');
    emptyPage.className = 'bg-white dark:bg-slate-800 shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-12 text-slate-400 select-none';
    emptyPage.style.width = '794px';
    emptyPage.style.height = '1123px';
    emptyPage.innerHTML = `
      <i class="fa-solid fa-file-circle-plus text-5xl mb-4 text-slate-300 dark:text-slate-600"></i>
      <p class="text-sm font-bold text-slate-700 dark:text-slate-200">Seu documento está vazio</p>
      <p class="text-xs text-slate-400 mt-1">Faça um recorte à esquerda e clique em "Adicionar Recorte" para ver a prévia aqui.</p>
    `;
    a4PagesContainer.appendChild(emptyPage);
    return;
  }

  const sections = [];
  let currentSection = null;

  state.elements.forEach(el => {
    if (el.type === 'header' || !currentSection) {
      currentSection = {
        header: el.type === 'header' ? el : null,
        snippets: []
      };
      if (el.type !== 'header') currentSection.snippets.push(el);
      sections.push(currentSection);
    } else {
      currentSection.snippets.push(el);
    }
  });

  let pageIndex = 1;

  function createNewA4Page() {
    const pageEl = document.createElement('div');
    pageEl.className = 'bg-white shadow-2xl relative border border-slate-300 dark:border-slate-700 flex flex-col box-border space-y-3 transition-all';
    pageEl.style.width = '794px';
    pageEl.style.minHeight = '1123px';
    pageEl.style.height = 'auto';
    pageEl.style.padding = `${state.pagePadding}px`;

    const pageBadge = document.createElement('div');
    pageBadge.className = 'absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded z-10 pointer-events-none select-none';
    pageBadge.textContent = `Página A4 - ${pageIndex++}`;
    pageEl.appendChild(pageBadge);

    a4PagesContainer.appendChild(pageEl);
    return pageEl;
  }

  let currentPageEl = createNewA4Page();

  sections.forEach((sec) => {
    if (sec.header) {
      const hdrWrapper = document.createElement('div');
      hdrWrapper.className = 'relative group w-full shrink-0 border border-amber-300 rounded p-0.5 bg-amber-50/20';

      const img = document.createElement('img');
      img.src = sec.header.dataUrl;
      img.className = 'w-full h-auto block';
      if (state.autoWhiteBg) img.style.mixBlendMode = 'multiply';

      const delBtn = document.createElement('button');
      delBtn.className = 'absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow hover:bg-rose-700 z-10';
      delBtn.title = 'Remover cabeçalho';
      delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        removeElement(sec.header.id);
      };

      hdrWrapper.appendChild(img);
      hdrWrapper.appendChild(delBtn);

      currentPageEl.appendChild(hdrWrapper);
    }

    if (sec.snippets.length > 0) {
      const gridContainer = document.createElement('div');
      gridContainer.className = `grid ${state.layoutColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'} w-full border border-slate-100 rounded p-1`;
      gridContainer.style.gap = `${state.blockGap}px`;

      const col1 = document.createElement('div');
      col1.className = 'flex flex-col space-y-2';
      col1.style.gap = `${state.blockGap}px`;

      const col2 = document.createElement('div');
      col2.className = `flex flex-col space-y-2 ${state.layoutColumns === 1 ? 'hidden' : ''}`;
      col2.style.gap = `${state.blockGap}px`;

      gridContainer.appendChild(col1);
      gridContainer.appendChild(col2);

      sec.snippets.forEach(snip => {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'relative group rounded border border-transparent hover:border-brand-400 p-0.5';

        const img = document.createElement('img');
        img.src = snip.dataUrl;
        img.className = 'w-full h-auto block';
        if (state.autoWhiteBg) img.style.mixBlendMode = 'multiply';

        const delBtn = document.createElement('button');
        delBtn.className = 'absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow hover:bg-rose-700 z-10';
        delBtn.title = 'Remover recorte';
        delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        delBtn.onclick = (e) => {
          e.stopPropagation();
          removeElement(snip.id);
        };

        itemWrapper.appendChild(img);
        itemWrapper.appendChild(delBtn);

        if (state.layoutColumns === 2 && snip.column === 2) {
          col2.appendChild(itemWrapper);
        } else {
          col1.appendChild(itemWrapper);
        }
      });

      currentPageEl.appendChild(gridContainer);
    }
  });
}

/**
 * EXPORTAÇÃO DE PDF UNIFICADO (PÁGINA ÚNICA CONTINUA)
 */
function generateUnifiedCanvas(elementsSubset) {
  return new Promise((resolve) => {
    const scale = 2;
    const a4W = 794 * scale;
    const padding = state.pagePadding * scale;
    const gap = state.blockGap * scale;
    const numCols = state.layoutColumns;
    const colW = (a4W - (padding * 2) - ((numCols - 1) * gap)) / numCols;

    const renderPromises = elementsSubset.map(el => new Promise(res => {
      const img = new Image();
      img.onload = () => res({ el, img });
      img.src = el.dataUrl;
    }));

    Promise.all(renderPromises).then(rendered => {
      // Simulação inicial para calcular a altura total necessária com duas colunas
      let currentYCol1 = padding;
      let currentYCol2 = padding;

      rendered.forEach(({ el, img }) => {
        if (el.type === 'header') {
          let maxY = Math.max(currentYCol1, currentYCol2);
          const w = a4W - (padding * 2);
          const h = w * (img.naturalHeight / img.naturalWidth);
          currentYCol1 = maxY + h + gap;
          currentYCol2 = maxY + h + gap;
        } else {
          const h = colW * (img.naturalHeight / img.naturalWidth);
          let isCol2 = numCols === 2 && el.column === 2;
          if (isCol2) {
            currentYCol2 += h + gap;
          } else {
            currentYCol1 += h + gap;
          }
        }
      });

      const totalHeight = Math.max(currentYCol1, currentYCol2) + padding;

      // Cria um único Canvas gigante com a altura exata de todos os elementos somados
      const canvas = document.createElement('canvas');
      canvas.width = a4W;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, a4W, totalHeight);

      let drawYCol1 = padding;
      let drawYCol2 = padding;

      rendered.forEach(({ el, img }) => {
        if (el.type === 'header') {
          let maxY = Math.max(drawYCol1, drawYCol2);
          const w = a4W - (padding * 2);
          const h = w * (img.naturalHeight / img.naturalWidth);
          ctx.drawImage(img, padding, maxY, w, h);
          drawYCol1 = maxY + h + gap;
          drawYCol2 = maxY + h + gap;
        } else {
          const h = colW * (img.naturalHeight / img.naturalWidth);
          let isCol2 = numCols === 2 && el.column === 2;
          let targetY = isCol2 ? drawYCol2 : drawYCol1;
          let posX = isCol2 ? padding + colW + gap : padding;

          ctx.drawImage(img, posX, targetY, colW, h);

          if (isCol2) {
            drawYCol2 = targetY + h + gap;
          } else {
            drawYCol1 = targetY + h + gap;
          }
        }
      });

      resolve(canvas);
    });
  });
}

async function exportAsPDF() {
  if (state.elements.length === 0) {
    showToast('Adicione ao menos um recorte antes de baixar o PDF!', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const canvas = await generateUnifiedCanvas(state.elements);
  
  const imgWidth = 210; // largura em mm (A4)
  const imgHeight = (canvas.height * imgWidth) / canvas.width; // altura proporcional personalizada
  
  // Cria o PDF com uma página única de altura personalizada (documento unificado e contínuo)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [imgWidth, imgHeight] });
  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  pdf.save(`Documento_Unificado_${Date.now()}.pdf`);

  showToast('PDF unificado gerado com sucesso!');
}

window.addEventListener('DOMContentLoaded', init);