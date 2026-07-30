class PrintStickerPage {
  constructor() {
    this.products = window.products || [];
    this.sheet = document.getElementById('printSheet');

    if (!this.sheet) return;
    this.renderSheet();
  }

  renderBarcode(canvas, text) {
    if (!canvas || !text) return;

    try {
      const dpr = window.devicePixelRatio || 1;
      const style = window.getComputedStyle(canvas);
      const rawWidth = parseFloat(style.width) || canvas.clientWidth || 0;
      const rawHeight = parseFloat(style.height) || canvas.clientHeight || 0;
      const width = Math.max(1, Math.round(rawWidth * dpr));
      const height = Math.max(1, Math.round(rawHeight * dpr));

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rawWidth}px`;
      canvas.style.height = `${rawHeight}px`;

      bwipjs.toCanvas(canvas, {
        bcid: 'code128',
        text,
        scale: Math.max(1, Math.round(dpr)),
        height: Math.max(1, Math.round(rawHeight * dpr)),
        includetext: false,
        paddingwidth: 0,
        paddingheight: 0,
        margin: 0,
      });
    } catch (error) {
      console.error('Barcode render failed for text:', text, error);
    }
  }

  createTextRow(labelText, valueText) {
    const row = document.createElement('div');
    const isValueOnly = !labelText;
    row.className = isValueOnly ? 'sticker-row barcode-value-row' : 'sticker-row';

    if (!isValueOnly) {
      const label = document.createElement('div');
      label.textContent = labelText;
      row.appendChild(label);
    }

    const value = document.createElement('div');
    value.className = isValueOnly ? 'barcode-value' : '';
    value.textContent = valueText;
    row.appendChild(value);

    return row;
  }

  createLabelBar(labelText, barcodeValue) {
    const line = document.createElement('div');
    line.className = 'detail-label-line';

    const label = document.createElement('span');
    label.className = 'detail-label-text';
    label.textContent = labelText;
    line.appendChild(label);

    const barcode = document.createElement('canvas');
    barcode.className = 'barcode';
    barcode.dataset.barcodeText = barcodeValue || '';
    line.appendChild(barcode);

    return line;
  }

  createStickerCell(product) {
    const cell = document.createElement('td');
    cell.className = 'sticker-cell';

    const content = document.createElement('div');
    content.className = 'sticker-content';

    if (!product) {
      cell.appendChild(content);
      return cell;
    }

    content.appendChild(this.createTextRow('Item:', product.item || ''));
    content.appendChild(this.createTextRow('Specification:', product.specification || ''));
    content.appendChild(this.createTextRow('Power:', product.power || ''));
    content.appendChild(this.createTextRow('Management IP:', product.management_ip || ''));
    content.appendChild(this.createTextRow('Username/Password:', product.username_password || ''));

    const ssidRow = document.createElement('div');
    ssidRow.className = 'ssid-row';
    const ssid5 = document.createElement('span');
    ssid5.textContent = `WiFi SSID(5G): ${product.wifi_ssid_5g || ''}`;
    const ssid24 = document.createElement('span');
    ssid24.textContent = `WiFi SSID(2.4G): ${product.wifi_ssid_24g || ''}`;
    ssidRow.appendChild(ssid5);
    ssidRow.appendChild(ssid24);
    content.appendChild(ssidRow);

    content.appendChild(this.createTextRow('WiFi Key(WPA)(2.4G/5G):', product.wifi_key || ''));
    content.appendChild(this.createLabelBar('MAC:', product.mac || ''));
    content.appendChild(this.createTextRow('', product.mac || ''));
    content.appendChild(this.createLabelBar('PON S/N:', product.pon_sn || ''));
    content.appendChild(this.createTextRow('', product.pon_sn || ''));
    content.appendChild(this.createLabelBar('S/N:', product.sn || ''));
    content.appendChild(this.createTextRow('', product.sn || ''));

    cell.appendChild(content);
    return cell;
  }

  renderSheet() {
    this.sheet.innerHTML = '';
    const table = document.createElement('table');
    const rowCount = 7;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = document.createElement('tr');
      const leftIndex = rowIndex * 2;
      const rightIndex = leftIndex + 1;
      const leftProduct = this.products[leftIndex] || null;
      const rightProduct = this.products[rightIndex] || null;

      row.appendChild(this.createStickerCell(leftProduct));
      row.appendChild(this.createStickerCell(leftProduct));
      row.appendChild(this.createStickerCell(rightProduct));
      row.appendChild(this.createStickerCell(rightProduct));
      table.appendChild(row);
    }

    this.sheet.appendChild(table);
    this.renderPendingBarcodes();
  }

  renderPendingBarcodes() {
    this.sheet.querySelectorAll('canvas.barcode').forEach((canvas) => {
      const text = canvas.dataset.barcodeText;
      if (text) {
        this.renderBarcode(canvas, text);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PrintStickerPage());
} else {
  new PrintStickerPage();
}
