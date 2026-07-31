class DefectiveReportPage {
  constructor() {
    this.products = this.readEmbeddedJson('reportProductsData', window.reportProducts || []);
    this.vendors = this.readEmbeddedJson('reportVendorsData', window.reportVendors || []);
    this.rowsContainer = document.getElementById('reportRows');
    this.dateOutField = document.getElementById('dateOutField');
    this.printBtn = document.getElementById('printReportBtn');
    this.saveBtn = document.getElementById('saveReportBtn');
    this.reportTitleField = document.getElementById('reportTitle');
    this.testedByField = document.getElementById('testedBy');
    this.statusField = document.getElementById('statusField');
    this.dateInField = document.getElementById('dateInField');
    this.generalRemarksField = document.getElementById('generalRemarks');

    this.statusOptions = ['YES', 'NO', 'N/A'];
    this.boundBeforePrint = this.beforePrint.bind(this);
    this.boundAfterPrint = this.afterPrint.bind(this);
    this.init();
  }

  readEmbeddedJson(elementId, fallback) {
    const element = document.getElementById(elementId);
    if (!element) return fallback || [];

    try {
      return JSON.parse(element.textContent || '[]');
    } catch (error) {
      console.error(`Failed to parse embedded JSON from ${elementId}`, error);
      return fallback || [];
    }
  }

  init() {
    if (!this.rowsContainer) return;

    this.renderRows();
    window.addEventListener('beforeprint', this.boundBeforePrint);
    window.addEventListener('afterprint', this.boundAfterPrint);

    if (this.printBtn) {
      this.printBtn.addEventListener('click', () => {
        if (this.dateOutField) {
          this.dateOutField.value = this.getTodayIsoDate();
        }
        window.print();
      });
    }

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.saveReport());
    }

  }

  beforePrint() {
    this.toggleVendorSelects(true);
  }

  afterPrint() {
    this.toggleVendorSelects(false);
  }

  toggleVendorSelects(disabled) {
    const vendorSelects = document.querySelectorAll('select.vendor-select');
    vendorSelects.forEach((select) => {
      select.disabled = Boolean(disabled);
      if (disabled) {
        select.classList.add('status-na');
      } else {
        select.classList.remove('status-na');
      }
    });
  }

  getTodayIsoDate() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  createCell(content) {
    const td = document.createElement('td');
    if (typeof content === 'string') {
      td.textContent = content;
    } else if (content) {
      td.appendChild(content);
    }
    return td;
  }

  applyStatusClass(select) {
    select.classList.remove('status-yes', 'status-no', 'status-na');
    if (select.value === 'YES') {
      select.classList.add('status-yes');
    } else if (select.value === 'NO') {
      select.classList.add('status-no');
    } else {
      select.classList.add('status-na');
    }
  }

  buildStatusSelect(fieldName) {
    const select = document.createElement('select');
    select.className = 'status-select status-na';
    select.dataset.field = fieldName;

    this.statusOptions.forEach((option) => {
      const optionEl = document.createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      if (option === 'N/A') {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });

    select.addEventListener('change', () => this.applyStatusClass(select));
    this.applyStatusClass(select);
    return select;
  }

  buildVendorSelect(product) {
    const select = document.createElement('select');
    select.className = 'status-select vendor-select';
    select.dataset.field = 'vendor_id';
    const selectedVendorId = Number(product.vendor_id) || null;

    this.vendors.forEach((vendor) => {
      const option = document.createElement('option');
      option.value = String(vendor.id);
      option.textContent = vendor.name;
      if (selectedVendorId && Number(vendor.id) === selectedVendorId) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    return select;
  }

  renderRows() {
    this.rowsContainer.innerHTML = '';

    this.products.forEach((product, index) => {
      const row = document.createElement('tr');
      row.dataset.productId = product.id || '';
      row.dataset.position = String(index + 1);

      const modelText = product.specification || product.item || '';
      const snText = product.sn || '';

      row.appendChild(this.createCell(String(index + 1)));
      row.appendChild(this.createCell(modelText));
      row.appendChild(this.createCell(this.buildVendorSelect(product)));
      row.appendChild(this.createCell(snText));
      row.appendChild(this.createCell(this.buildStatusSelect('power_status')));
      row.appendChild(this.createCell(this.buildStatusSelect('pon_status')));
      row.appendChild(this.createCell(this.buildStatusSelect('wifi_24g_status')));
      row.appendChild(this.createCell(this.buildStatusSelect('wifi_5g_status')));
      row.appendChild(this.createCell(this.buildStatusSelect('lan_status')));
      row.appendChild(this.createCell(this.buildStatusSelect('catv_status')));

      const findingsInput = document.createElement('input');
      findingsInput.type = 'text';
      findingsInput.maxLength = 255;
      findingsInput.value = 'REPLACED STICKERS';
      findingsInput.className = 'full-width';
      findingsInput.dataset.field = 'findings';
      row.appendChild(this.createCell(findingsInput));

      this.rowsContainer.appendChild(row);
    });
  }

  collectRows() {
    return Array.from(this.rowsContainer.querySelectorAll('tr')).map((row, index) => {
      const product = this.products[index] || {};
      const rowData = {
        position: index + 1,
        product_id: product.id || null,
        vendor_id: product.vendor_id || null,
        item: product.item || '',
        specification: product.specification || product.spec || '',
        power: product.power || '',
        management_ip: product.management_ip || '',
        username_password: product.username_password || '',
        wifi_ssid_5g: product.wifi_ssid_5g || '',
        wifi_ssid_24g: product.wifi_ssid_24g || '',
        wifi_key: product.wifi_key || '',
        mac: product.mac || '',
        pon_sn: product.pon_sn || '',
        sn: product.sn || '',
        power_status: 'N/A',
        pon_status: 'N/A',
        wifi_24g_status: 'N/A',
        wifi_5g_status: 'N/A',
        lan_status: 'N/A',
        catv_status: 'N/A',
        findings: '',
      };

      row.querySelectorAll('[data-field]').forEach((fieldElement) => {
        const fieldName = fieldElement.dataset.field;
        if (!fieldName) return;

        if (fieldElement.tagName === 'SELECT' || fieldElement.tagName === 'INPUT' || fieldElement.tagName === 'TEXTAREA') {
          rowData[fieldName] = fieldElement.value;
        }
      });

      return rowData;
    });
  }

  collectReportPayload() {
    const dateOutValue = this.dateOutField && this.dateOutField.value ? this.dateOutField.value : this.getTodayIsoDate();

    return {
      report_title: this.reportTitleField ? this.reportTitleField.value : 'DEFECTIVE ONU REPORT',
      tested_by: this.testedByField ? this.testedByField.value : '',
      status: this.statusField ? this.statusField.value : '',
      date_in: this.dateInField ? this.dateInField.value : '',
      date_out: dateOutValue,
      general_remarks: this.generalRemarksField ? this.generalRemarksField.value : '',
      serial_code: '',
      items: this.collectRows(),
      products: this.products,
    };
  }

  async saveReport() {
    if (!this.saveBtn) return;

    this.saveBtn.disabled = true;
    try {
      const payload = this.collectReportPayload();
      const response = await fetch('/report/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save report.');
      }

      if (result.reportId) {
        window.location.href = `/reports/${result.reportId}`;
      }
    } catch (error) {
      alert(error.message || 'Failed to save report.');
    } finally {
      this.saveBtn.disabled = false;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new DefectiveReportPage());
} else {
  new DefectiveReportPage();
}
