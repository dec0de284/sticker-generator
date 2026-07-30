class TestingGeneratePage {
  constructor() {
    this.form = document.getElementById('dummyForm');
    this.countInput = document.getElementById('countInput');

    if (!this.form || !this.countInput) return;

    new AppModels.NumericRangeInput(this.countInput, 1, 100);
    new AppModels.TestingGenerateForm(this.form, this.countInput, { min: 1, max: 100 });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TestingGeneratePage());
} else {
  new TestingGeneratePage();
}
