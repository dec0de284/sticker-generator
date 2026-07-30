class GenerateStickerPage {
  constructor() {
    this.products = window.products || [];
    this.pageSize = 14;
    this.selectedIds = new Set();

    this.stickerRows = document.getElementById('stickerRows');
    this.selectedRows = document.getElementById('selectedRows');
    this.selectedCount = document.getElementById('selectedCount');
    this.pageSelect = document.getElementById('pageSelect');
    this.firstBtn = document.getElementById('firstBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.lastBtn = document.getElementById('lastBtn');
    this.selectAllBtn = document.getElementById('selectAllBtn');
    this.clearAllBtn = document.getElementById('clearAllBtn');
    this.clearSelectedBtn = document.getElementById('clearSelectedBtn');
    this.printForm = document.getElementById('printForm');
    this.selectedIdsInput = document.getElementById('selectedIdsInput');

    this.pagination = null;
    this.init();
  }

  init() {
    if (!this.stickerRows || !this.pageSelect) return;

    this.renderStickerRows();
    this.pagination = new AppModels.PaginationController({
      rows: Array.from(this.stickerRows.children),
      pageSelect: this.pageSelect,
      firstBtn: this.firstBtn,
      prevBtn: this.prevBtn,
      nextBtn: this.nextBtn,
      lastBtn: this.lastBtn,
      pageSize: this.pageSize,
    });

    this.attachEvents();
    this.updateSelectedRows();
  }

  attachEvents() {
    this.stickerRows.addEventListener('change', (event) => {
      if (!event.target.matches('input[type="checkbox"]')) return;

      const id = Number(event.target.dataset.id);
      if (event.target.checked) {
        if (this.selectedIds.size < 14) {
          this.selectedIds.add(id);
        } else {
          event.target.checked = false;
          alert('Only up to 14 entries may be selected for printing.');
        }
      } else {
        this.selectedIds.delete(id);
      }

      this.updateSelectedRows();
    });

    this.selectAllBtn.addEventListener('click', () => this.selectAllVisible());
    this.clearAllBtn.addEventListener('click', () => this.clearVisible());
    this.clearSelectedBtn.addEventListener('click', () => this.clearSelected());

    this.printForm.addEventListener('submit', (event) => {
      if (this.selectedIds.size === 0) {
        event.preventDefault();
        alert('Please select at least one item to print.');
        return;
      }
      this.selectedIdsInput.value = Array.from(this.selectedIds).slice(0, 14).join(',');
    });
  }

  renderStickerRows() {
    this.stickerRows.innerHTML = '';
    this.products.forEach((product) => {
      const row = document.createElement('tr');
      const checked = this.selectedIds.has(product.id) ? 'checked' : '';
      row.innerHTML = `
        <td>${product.id}</td>
        <td>${product.sn || ''}</td>
        <td><input type="checkbox" data-id="${product.id}" ${checked}></td>
      `;
      this.stickerRows.appendChild(row);
    });
  }

  updateSelectedRows() {
    this.selectedRows.innerHTML = '';
    const selectedProducts = this.products.filter((product) => this.selectedIds.has(product.id));

    selectedProducts.forEach((product) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.id}</td>
        <td>${product.sn || ''}</td>
      `;
      this.selectedRows.appendChild(row);
    });

    this.selectedCount.textContent = `${selectedProducts.length} selected`;
    this.refreshCheckboxState();
  }

  refreshCheckboxState() {
    this.stickerRows.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const id = Number(checkbox.dataset.id);
      checkbox.checked = this.selectedIds.has(id);
    });
  }

  selectAllVisible() {
    const visibleCheckboxes = Array.from(this.stickerRows.querySelectorAll('input[type="checkbox"]')).filter((checkbox) => checkbox.offsetParent !== null);
    let remaining = 14 - this.selectedIds.size;
    visibleCheckboxes.forEach((checkbox) => {
      if (remaining <= 0) return;
      const id = Number(checkbox.dataset.id);
      if (!this.selectedIds.has(id)) {
        this.selectedIds.add(id);
        remaining -= 1;
      }
    });
    this.updateSelectedRows();
  }

  clearVisible() {
    const visibleCheckboxes = Array.from(this.stickerRows.querySelectorAll('input[type="checkbox"]')).filter((checkbox) => checkbox.offsetParent !== null);
    visibleCheckboxes.forEach((checkbox) => {
      const id = Number(checkbox.dataset.id);
      this.selectedIds.delete(id);
    });
    this.updateSelectedRows();
  }

  clearSelected() {
    this.selectedIds.clear();
    this.updateSelectedRows();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GenerateStickerPage());
} else {
  new GenerateStickerPage();
}
