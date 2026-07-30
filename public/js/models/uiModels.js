class ElementHelper {
  static create(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  static createOption(value, text, selected) {
    const option = this.create('option');
    option.value = value;
    option.textContent = text;
    if (selected) option.selected = true;
    return option;
  }
}

class PaginationController {
  constructor({ rows = [], pageSelect, firstBtn, prevBtn, nextBtn, lastBtn, pageSize = 7 }) {
    this.rows = rows;
    this.pageSelect = pageSelect;
    this.firstBtn = firstBtn;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.lastBtn = lastBtn;
    this.pageSize = pageSize;
    this.currentPage = 1;

    this.init();
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.rows.length / this.pageSize));
  }

  init() {
    this.pageSelect.addEventListener('change', () => {
      this.currentPage = Number(this.pageSelect.value);
      this.render();
    });

    this.firstBtn.addEventListener('click', () => this.goFirst());
    this.prevBtn.addEventListener('click', () => this.goPrevious());
    this.nextBtn.addEventListener('click', () => this.goNext());
    this.lastBtn.addEventListener('click', () => this.goLast());

    this.render();
  }

  setRows(rows) {
    this.rows = rows || [];
    this.currentPage = 1;
    this.render();
  }

  goFirst() {
    this.currentPage = 1;
    this.render();
  }

  goPrevious() {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.render();
    }
  }

  goNext() {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
      this.render();
    }
  }

  goLast() {
    this.currentPage = this.totalPages;
    this.render();
  }

  render() {
    this.renderPageOptions();
    this.renderRows();
    this.updateButtons();
  }

  renderPageOptions() {
    this.pageSelect.innerHTML = '';
    for (let i = 1; i <= this.totalPages; i += 1) {
      this.pageSelect.appendChild(ElementHelper.createOption(i, i, i === this.currentPage));
    }
  }

  renderRows() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.rows.forEach((row, index) => {
      row.style.display = index >= start && index < end ? '' : 'none';
    });
  }

  updateButtons() {
    this.firstBtn.disabled = this.currentPage === 1;
    this.prevBtn.disabled = this.currentPage === 1;
    this.nextBtn.disabled = this.currentPage === this.totalPages;
    this.lastBtn.disabled = this.currentPage === this.totalPages;
  }
}

class SelectableTable {
  constructor({ tableBody, selectedCount, maxSelection = 14, onChange = null }) {
    this.tableBody = tableBody;
    this.selectedCount = selectedCount;
    this.maxSelection = maxSelection;
    this.selectedIds = new Set();
    this.onChange = onChange;

    this.init();
  }

  init() {
    if (!this.tableBody) return;

    this.tableBody.addEventListener('change', (event) => {
      if (!event.target.matches('input[type="checkbox"]')) return;

      const id = Number(event.target.dataset.id);
      const checked = event.target.checked;

      if (checked) {
        if (this.selectedIds.size < this.maxSelection) {
          this.selectedIds.add(id);
        } else {
          event.target.checked = false;
          alert(`Only up to ${this.maxSelection} entries may be selected for printing.`);
        }
      } else {
        this.selectedIds.delete(id);
      }

      this.updateSelectedCount();
      if (typeof this.onChange === 'function') {
        this.onChange(this.getSelectedIds());
      }
    });
  }

  updateSelectedCount() {
    if (!this.selectedCount) return;
    this.selectedCount.textContent = `${this.selectedIds.size} selected`;
  }

  getSelectedIds() {
    return Array.from(this.selectedIds);
  }
}

class FormSubmitLimiter {
  constructor(form, hiddenInput, selectionController) {
    this.form = form;
    this.hiddenInput = hiddenInput;
    this.selectionController = selectionController;

    if (!this.form || !this.hiddenInput || !this.selectionController) return;

    this.form.addEventListener('submit', (event) => {
      const selectedIds = this.selectionController.getSelectedIds();
      if (!selectedIds.length) {
        event.preventDefault();
        alert('Please select at least one item to print.');
        return;
      }
      this.hiddenInput.value = selectedIds.slice(0, this.selectionController.maxSelection).join(',');
    });
  }
}

class NumericRangeInput {
  constructor(inputElement, min, max) {
    this.inputElement = inputElement;
    this.min = min;
    this.max = max;
    this.attachEvents();
  }

  attachEvents() {
    this.inputElement.addEventListener('beforeinput', this.handleBeforeInput.bind(this));
    this.inputElement.addEventListener('paste', this.handlePaste.bind(this));
    this.inputElement.addEventListener('input', this.handleInput.bind(this));
  }

  handleBeforeInput(event) {
    const data = event.data;
    if (!data || !/^[0-9]+$/.test(data)) {
      event.preventDefault();
      return;
    }
    const nextValue = this.inputElement.value.slice(0, this.inputElement.selectionStart) + data + this.inputElement.value.slice(this.inputElement.selectionEnd);
    if (nextValue.length > 3) {
      event.preventDefault();
    }
  }

  handlePaste(event) {
    const pasteText = (event.clipboardData || window.clipboardData).getData('text');
    if (!/^[0-9]+$/.test(pasteText)) {
      event.preventDefault();
    }
  }

  handleInput() {
    let value = this.inputElement.value.replace(/\D/g, '');
    if (value === '') {
      this.inputElement.value = '';
      return;
    }
    let numeric = Number(value);
    if (numeric < this.min) numeric = this.min;
    if (numeric > this.max) numeric = this.max;
    this.inputElement.value = String(numeric);
  }
}

class TestingGenerateForm {
  constructor(formElement, inputElement, rangeInput) {
    this.formElement = formElement;
    this.inputElement = inputElement;
    this.rangeInput = rangeInput;
    this.formElement.addEventListener('submit', this.handleSubmit.bind(this));
  }

  handleSubmit(event) {
    const value = Number(this.inputElement.value);
    if (!Number.isInteger(value) || value < this.rangeInput.min || value > this.rangeInput.max) {
      event.preventDefault();
      this.inputElement.value = value < this.rangeInput.min ? String(this.rangeInput.min) : value > this.rangeInput.max ? String(this.rangeInput.max) : '';
    }
  }
}

window.AppModels = {
  ElementHelper,
  PaginationController,
  SelectableTable,
  FormSubmitLimiter,
  NumericRangeInput,
  TestingGenerateForm,
};
