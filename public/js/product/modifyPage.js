class ModifyProductPage {
  constructor() {
    this.tableBody = document.querySelector('#modifyTable tbody');
    this.firstBtn = document.getElementById('firstBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.lastBtn = document.getElementById('lastBtn');
    this.pageSelect = document.getElementById('pageSelect');
    this.rows = Array.from(this.tableBody ? this.tableBody.children : []);

    this.init();
  }

  init() {
    if (!this.tableBody || !this.pageSelect) return;

    new AppModels.PaginationController({
      rows: this.rows,
      pageSelect: this.pageSelect,
      firstBtn: this.firstBtn,
      prevBtn: this.prevBtn,
      nextBtn: this.nextBtn,
      lastBtn: this.lastBtn,
      pageSize: 7,
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ModifyProductPage());
} else {
  new ModifyProductPage();
}
