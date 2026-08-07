const fs = require('fs');
const path = require('path');
const productModel = require('../models/productModel');
const defaultRegistrationFields = require('./productRegistrationDefaults.json');

function escapeHTML(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNotification(res, title, message) {
  const htmlTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'notification.html'), 'utf8');
  const html = htmlTemplate
    .replace(/{{title}}/g, escapeHTML(title))
    .replace(/{{message}}/g, escapeHTML(message));
  res.send(html);
}

function normalizeFieldValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeVendorId(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) {
    return null;
  }
  return numeric;
}

function readView(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', 'views', ...segments), 'utf8');
}

function resolveVendorId(candidateVendorId, callback) {
  const normalized = normalizeVendorId(candidateVendorId);
  if (normalized) {
    return callback(null, normalized);
  }
  productModel.getDefaultVendorId(callback);
}

function buildVendorOptions(vendors, selectedVendorId) {
  const selected = normalizeVendorId(selectedVendorId);
  return (vendors || [])
    .map((vendor) => {
      const isSelected = selected && vendor.id === selected;
      return `<option value="${escapeHTML(vendor.id)}"${isSelected ? ' selected' : ''}>${escapeHTML(vendor.name)}</option>`;
    })
    .join('');
}

function parseSelectedIds(rawIds) {
  const ids = String(rawIds || '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return Array.from(new Set(ids)).slice(0, 14);
}

function toReportDateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeReportText(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeReportStatus(value) {
  const text = normalizeReportText(value);
  return text || 'N/A';
}

function normalizeReportDate(value) {
  const text = normalizeReportText(value);
  if (!text) return '';

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return toReportDateLabel(date.toISOString());
}

function normalizeReportItems(items, fallbackProducts = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => {
    const fallback = fallbackProducts[index] || {};
    return {
      position: Number.isInteger(Number(item.position)) ? Number(item.position) : index + 1,
      product_id: Number(item.product_id || fallback.id) || null,
      vendor_id: normalizeVendorId(item.vendor_id || fallback.vendor_id) || null,
      item: normalizeReportText(item.item || fallback.item),
      specification: normalizeReportText(item.specification || fallback.specification || fallback.spec),
      power: normalizeReportText(item.power || fallback.power),
      management_ip: normalizeReportText(item.management_ip || fallback.management_ip),
      username_password: normalizeReportText(item.username_password || fallback.username_password),
      wifi_ssid_5g: normalizeReportText(item.wifi_ssid_5g || fallback.wifi_ssid_5g),
      wifi_ssid_24g: normalizeReportText(item.wifi_ssid_24g || fallback.wifi_ssid_24g),
      wifi_key: normalizeReportText(item.wifi_key || fallback.wifi_key),
      mac: normalizeReportText(item.mac || fallback.mac),
      pon_sn: normalizeReportText(item.pon_sn || fallback.pon_sn),
      sn: normalizeReportText(item.sn || fallback.sn),
      power_status: normalizeReportStatus(item.power_status),
      pon_status: normalizeReportStatus(item.pon_status),
      wifi_24g_status: normalizeReportStatus(item.wifi_24g_status),
      wifi_5g_status: normalizeReportStatus(item.wifi_5g_status),
      lan_status: normalizeReportStatus(item.lan_status),
      catv_status: normalizeReportStatus(item.catv_status),
      findings: normalizeReportText(item.findings),
    };
  });
}

function buildReportPayload(body) {
  const rawItems = Array.isArray(body.items) ? body.items : [];

  const nowIso = new Date().toISOString();
  return {
    report_title: normalizeReportText(body.report_title || body.title || 'ONU STATUS REPORT') || 'ONU STATUS REPORT',
    tested_by: normalizeReportText(body.tested_by),
    status: normalizeReportStatus(body.status),
    date_in: normalizeReportDate(body.date_in),
    date_out: normalizeReportDate(body.date_out),
    general_remarks: normalizeReportText(body.general_remarks),
    serial_code: normalizeReportText(body.serial_code),
    generated_at: nowIso,
    updated_at: nowIso,
    items: normalizeReportItems(rawItems, body.products || []),
  };
}

function getDateInFromProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return '';
  }

  const validTimes = products
    .map((product) => (product && product.scanned_at ? new Date(product.scanned_at) : null))
    .filter((date) => date && !Number.isNaN(date.getTime()))
    .map((date) => date.getTime());

  if (!validTimes.length) {
    return toReportDateLabel(new Date().toISOString());
  }

  return toReportDateLabel(new Date(Math.min(...validTimes)).toISOString());
}

function serializeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function renderReportHtml(products, vendors, options = {}) {
  const reportData = options.reportData || null;
  const statusValue = typeof options.status === 'string' ? options.status : 'Tested';
  const dateInValue = typeof options.dateIn === 'string' ? options.dateIn : getDateInFromProducts(products);
  const rawProductsJson = serializeJsonForHtml(products || []);
  const rawVendorsJson = serializeJsonForHtml(vendors || []);
  const rawSavedReportJson = serializeJsonForHtml(reportData);

  const htmlTemplate = readView('product', 'report.html');
  return htmlTemplate
    .replace('{{productsJson}}', rawProductsJson)
    .replace('{{vendorsJson}}', rawVendorsJson)
    .replace('{{savedReportJson}}', rawSavedReportJson)
    .replace(/{{dateIn}}/g, escapeHTML(dateInValue))
    .replace(/{{status}}/g, escapeHTML(statusValue));
}

function buildProductFromBody(body, options = {}) {
  const applyDefaults = Boolean(options.applyDefaults);
  const product = {
    item: normalizeFieldValue(body.item),
    specification: normalizeFieldValue(body.specification || body.spec),
    power: normalizeFieldValue(body.power),
    management_ip: normalizeFieldValue(body.management_ip || body.mgmt_ip),
    username_password: normalizeFieldValue(body.username_password || body.cred),
    wifi_ssid_5g: normalizeFieldValue(body.wifi_ssid_5g || body.ssid_5g),
    wifi_ssid_24g: normalizeFieldValue(body.wifi_ssid_24g || body.ssid_24g),
    wifi_key: normalizeFieldValue(body.wifi_key),
    mac: normalizeFieldValue(body.mac),
    pon_sn: normalizeFieldValue(body.pon_sn),
    sn: normalizeFieldValue(body.sn),
    vendor_id: normalizeVendorId(body.vendor_id),
    scanned_at: normalizeFieldValue(body.scanned_at),
  };

  if (!applyDefaults) {
    return product;
  }

  return {
    item: product.item || defaultRegistrationFields.item,
    specification: product.specification || defaultRegistrationFields.specification,
    power: product.power || defaultRegistrationFields.power,
    management_ip: product.management_ip || defaultRegistrationFields.management_ip,
    username_password: product.username_password || defaultRegistrationFields.username_password,
    wifi_ssid_5g: product.wifi_ssid_5g || defaultRegistrationFields.wifi_ssid_5g,
    wifi_ssid_24g: product.wifi_ssid_24g || defaultRegistrationFields.wifi_ssid_24g,
    wifi_key: product.wifi_key || defaultRegistrationFields.wifi_key,
    mac: product.mac,
    pon_sn: product.pon_sn,
    sn: product.sn,
    vendor_id: product.vendor_id,
    scanned_at: product.scanned_at,
  };
}

function createProductWithDuplicateCheck(product, callback) {
  productModel.findDuplicate(product, null, (duplicateError, row) => {
    if (duplicateError) {
      return callback(duplicateError);
    }

    if (row) {
      return callback(null, { duplicate: true });
    }

    resolveVendorId(product.vendor_id, (vendorErr, vendorId) => {
      if (vendorErr) {
        return callback(vendorErr);
      }

      const productForInsert = {
        ...product,
        vendor_id: vendorId,
        scanned_at: product.scanned_at || new Date().toISOString(),
      };

      productModel.createProduct(productForInsert, (createError, id) => {
        if (createError) {
          return callback(createError);
        }

        callback(null, { duplicate: false, id });
      });
    });
  });
}

exports.showRegistration = (req, res) => {
  productModel.getVendors('', (err, vendors) => {
    if (err) {
      return res.status(500).send('Failed to load vendors');
    }

    const template = readView('product', 'register.html');
    const html = template.replace('{{vendorOptions}}', buildVendorOptions(vendors, null));
    res.send(html);
  });
};

exports.submitRegistration = (req, res) => {
  const product = buildProductFromBody(req.body);
  product.scanned_at = new Date().toISOString();

  createProductWithDuplicateCheck(product, (err, result) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    if (result.duplicate) {
      return res.send('<p>Warning: Duplicate product with matching MAC, PON S/N, or S/N already exists.</p><p><a href="/register">Back to Register</a></p>');
    }

    renderNotification(res, 'Product Registered', 'Product registered successfully.');
  });
};

exports.submitRegistrationJson = (req, res) => {
  const product = buildProductFromBody(req.body || {}, { applyDefaults: true });
  product.scanned_at = new Date().toISOString();

  if (!product.mac || !product.pon_sn || !product.sn) {
    return res.status(204).end();
  }

  createProductWithDuplicateCheck(product, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (result.duplicate) {
      return res.status(409).json({ message: 'Duplicate product with matching MAC, PON S/N, or S/N already exists.' });
    }

    return res.status(201).json({ message: 'Product registered successfully.' });
  });
};

exports.showRegistrationSuccess = (req, res) => {
  renderNotification(res, 'Product Registered', 'Product registered successfully.');
};

exports.showModifyList = (req, res) => {
  const searchSn = req.query.sn ? req.query.sn.trim() : '';

  productModel.getAllProducts(searchSn, (err, products) => {
    if (err) {
      return res.status(500).send('Failed to load products');
    }

    const tableRows = products
      .map((product) => {
        return `<tr>
          <td>${escapeHTML(product.id)}</td>
          <td>${escapeHTML(product.item)}</td>
          <td>${escapeHTML(product.vendor_name || '')}</td>
          <td>${escapeHTML(product.specification)}</td>
          <td>${escapeHTML(product.power)}</td>
          <td>${escapeHTML(product.management_ip)}</td>
          <td>${escapeHTML(product.username_password)}</td>
          <td>${escapeHTML(product.wifi_ssid_5g)}</td>
          <td>${escapeHTML(product.wifi_ssid_24g)}</td>
          <td>${escapeHTML(product.wifi_key)}</td>
          <td>${escapeHTML(product.mac)}</td>
          <td>${escapeHTML(product.pon_sn)}</td>
          <td>${escapeHTML(product.sn)}</td>
          <td><a href="/edit/${product.id}">Edit</a></td>
        </tr>`;
      })
      .join('');

    const htmlTemplate = readView('product', 'modify.html');
    const html = htmlTemplate
      .replace('{{tableRows}}', tableRows)
      .replace('{{searchValue}}', escapeHTML(searchSn));
    res.send(html);
  });
};

exports.showGenerateSticker = (req, res) => {
  productModel.getAllProducts('', (err, products) => {
    if (err) {
      return res.status(500).send('Failed to load products');
    }

    productModel.getVendors('', (vendorErr, vendors) => {
      if (vendorErr) {
        return res.status(500).send('Failed to load vendors');
      }

      const rawProductsJson = serializeJsonForHtml(products);
      const rawVendorsJson = serializeJsonForHtml(vendors);
      const htmlTemplate = readView('product', 'generate.html');
      const html = htmlTemplate
        .replace('{{productsJson}}', rawProductsJson)
        .replace('{{vendorsJson}}', rawVendorsJson);
      res.send(html);
    });
  });
};

exports.showReportSelection = (req, res) => {
  productModel.getAllProducts('', (err, products) => {
    if (err) {
      return res.status(500).send('Failed to load products');
    }

    productModel.getVendors('', (vendorErr, vendors) => {
      if (vendorErr) {
        return res.status(500).send('Failed to load vendors');
      }

      const rawProductsJson = serializeJsonForHtml(products);
      const rawVendorsJson = serializeJsonForHtml(vendors);
      const htmlTemplate = readView('product', 'report-select.html');
      const html = htmlTemplate
        .replace('{{productsJson}}', rawProductsJson)
        .replace('{{vendorsJson}}', rawVendorsJson);
      res.send(html);
    });
  });
};

exports.showReportPage = (req, res) => {
  const ids = parseSelectedIds(req.body.selectedIds);
  if (!ids.length) {
    return res.redirect('/report/select');
  }

  productModel.getProductsByIds(ids, (err, products) => {
    if (err) {
      return res.status(500).send('Failed to load products for report');
    }

    productModel.getVendors('', (vendorErr, vendors) => {
      if (vendorErr) {
        return res.status(500).send('Failed to load vendors');
      }

      const html = renderReportHtml(products, vendors, {
        reportData: null,
        status: 'Tested',
        dateIn: getDateInFromProducts(products),
      });
      res.send(html);
    });
  });
};

exports.saveReport = (req, res) => {
  const report = buildReportPayload(req.body || {});

  if (!report.items.length) {
    return res.status(400).json({ message: 'Report items are required.' });
  }

  productModel.createReport(report, (err, reportId) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to save report.' });
    }

    return res.status(201).json({
      message: 'Report saved successfully.',
      reportId,
    });
  });
};

exports.showReports = (req, res) => {
  productModel.getReports((err, reports) => {
    if (err) {
      return res.status(500).send('Failed to load reports');
    }

    const tableRows = (reports || [])
      .map((report) => {
        return `<tr>
          <td>${escapeHTML(report.id)}</td>
          <td>${escapeHTML(toReportDateLabel(report.generated_at))}</td>
          <td>${escapeHTML(report.report_title)}</td>
          <td>${escapeHTML(report.tested_by || '')}</td>
          <td>${escapeHTML(report.status || '')}</td>
          <td><a href="/reports/${report.id}">View</a></td>
        </tr>`;
      })
      .join('');

    const htmlTemplate = readView('product', 'report-list.html');
    const html = htmlTemplate.replace('{{tableRows}}', tableRows || '<tr><td colspan="6">No reports found.</td></tr>');
    res.send(html);
  });
};

exports.showSavedReport = (req, res) => {
  const reportId = Number(req.params.id);

  productModel.getReportById(reportId, (reportErr, report) => {
    if (reportErr) {
      return res.status(500).send('Failed to load report');
    }
    if (!report) {
      return res.status(404).send('Report not found');
    }

    productModel.getReportItemsByReportId(reportId, (itemsErr, items) => {
      if (itemsErr) {
        return res.status(500).send('Failed to load report items');
      }

      const reportRows = (items || [])
        .map((item) => {
          return `<tr>
            <td>${escapeHTML(item.position)}</td>
            <td>${escapeHTML(item.specification || item.item || '')}</td>
            <td>${escapeHTML(item.vendor_name || item.vendor_id || '')}</td>
            <td>${escapeHTML(item.sn || '')}</td>
            <td>${escapeHTML(item.power || '')}</td>
            <td>${escapeHTML(item.pon_status || '')}</td>
            <td>${escapeHTML(item.wifi_24g_status || '')}</td>
            <td>${escapeHTML(item.wifi_5g_status || '')}</td>
            <td>${escapeHTML(item.lan_status || '')}</td>
            <td>${escapeHTML(item.catv_status || '')}</td>
            <td>${escapeHTML(item.findings || '')}</td>
          </tr>`;
        })
        .join('');

      const htmlTemplate = readView('product', 'report-view.html');
      const html = htmlTemplate
        .replace(/{{id}}/g, escapeHTML(report.id))
        .replace(/{{report_title}}/g, escapeHTML(report.report_title || ''))
        .replace(/{{tested_by}}/g, escapeHTML(report.tested_by || ''))
        .replace(/{{status}}/g, escapeHTML(report.status || ''))
        .replace(/{{date_in}}/g, escapeHTML(report.date_in || ''))
        .replace(/{{date_out}}/g, escapeHTML(report.date_out || ''))
        .replace(/{{generated_at}}/g, escapeHTML(toReportDateLabel(report.generated_at || '')))
        .replace(/{{general_remarks}}/g, escapeHTML(report.general_remarks || ''))
        .replace('{{tableRows}}', reportRows || '<tr><td colspan="11">No report items found.</td></tr>');

      res.send(html);
    });
  });
};

exports.showSavedReportPrint = (req, res) => {
  const reportId = Number(req.params.id);

  productModel.getReportById(reportId, (reportErr, report) => {
    if (reportErr) {
      return res.status(500).send('Failed to load report');
    }
    if (!report) {
      return res.status(404).send('Report not found');
    }

    productModel.getReportItemsByReportId(reportId, (itemsErr, items) => {
      if (itemsErr) {
        return res.status(500).send('Failed to load report items');
      }

      productModel.getVendors('', (vendorErr, vendors) => {
        if (vendorErr) {
          return res.status(500).send('Failed to load vendors');
        }

        const normalizedItems = normalizeReportItems(items || []);
        const products = normalizedItems.map((item) => ({
          id: item.product_id,
          vendor_id: item.vendor_id,
          item: item.item,
          specification: item.specification,
          power: item.power,
          management_ip: item.management_ip,
          username_password: item.username_password,
          wifi_ssid_5g: item.wifi_ssid_5g,
          wifi_ssid_24g: item.wifi_ssid_24g,
          wifi_key: item.wifi_key,
          mac: item.mac,
          pon_sn: item.pon_sn,
          sn: item.sn,
        }));

        const reportData = {
          id: report.id,
          report_title: report.report_title || 'ONU STATUS REPORT',
          tested_by: report.tested_by || '',
          status: report.status || 'Tested',
          date_in: normalizeReportDate(report.date_in),
          date_out: normalizeReportDate(report.date_out),
          general_remarks: report.general_remarks || '',
          items: normalizedItems,
        };

        const html = renderReportHtml(products, vendors, {
          reportData,
          status: reportData.status,
          dateIn: reportData.date_in,
        });

        return res.send(html);
      });
    });
  });
};

exports.showVendors = (req, res) => {
  const searchName = req.query.name ? req.query.name.trim() : '';

  productModel.getVendors(searchName, (err, vendors) => {
    if (err) {
      return res.status(500).send('Failed to load vendors');
    }

    const tableRows = vendors
      .map((vendor) => `<tr>
        <td>${escapeHTML(vendor.id)}</td>
        <td>${escapeHTML(vendor.name)}</td>
        <td><a href="/vendors/edit/${vendor.id}">Edit</a> | <a href="/vendors/delete/${vendor.id}" onclick="return confirm('Delete this vendor?');">Delete</a></td>
      </tr>`)
      .join('');

    const htmlTemplate = readView('product', 'vendors.html');
    const html = htmlTemplate
      .replace('{{searchValue}}', escapeHTML(searchName))
      .replace('{{tableRows}}', tableRows || '<tr><td colspan="3">No vendors found.</td></tr>');

    res.send(html);
  });
};

exports.addVendor = (req, res) => {
  const name = normalizeFieldValue(req.body.vendor_name);
  if (!name) {
    return renderNotification(res, 'Invalid Vendor', 'Vendor name is required.');
  }
  if (name.length > 255) {
    return renderNotification(res, 'Invalid Vendor', 'Vendor name must be 255 characters or less.');
  }

  productModel.createVendor(name, (err) => {
    if (err) {
      if (String(err.message || '').includes('UNIQUE')) {
        return renderNotification(res, 'Duplicate Vendor', 'Vendor already exists.');
      }
      return res.status(500).send('Failed to add vendor');
    }
    return res.redirect('/vendors');
  });
};

exports.showEditVendor = (req, res) => {
  const id = Number(req.params.id);

  productModel.getVendorById(id, (err, vendor) => {
    if (err) {
      return res.status(500).send('Failed to load vendor');
    }
    if (!vendor) {
      return res.status(404).send('Vendor not found');
    }

    const htmlTemplate = readView('product', 'vendor-edit.html');
    const html = htmlTemplate
      .replace(/{{id}}/g, escapeHTML(vendor.id))
      .replace(/{{name}}/g, escapeHTML(vendor.name));

    res.send(html);
  });
};

exports.submitEditVendor = (req, res) => {
  const id = Number(req.params.id);
  const name = normalizeFieldValue(req.body.vendor_name);

  if (!name) {
    return renderNotification(res, 'Invalid Vendor', 'Vendor name is required.');
  }
  if (name.length > 255) {
    return renderNotification(res, 'Invalid Vendor', 'Vendor name must be 255 characters or less.');
  }

  productModel.updateVendor(id, name, (err, changes) => {
    if (err) {
      if (String(err.message || '').includes('UNIQUE')) {
        return renderNotification(res, 'Duplicate Vendor', 'Vendor already exists.');
      }
      return res.status(500).send('Failed to update vendor');
    }
    if (!changes) {
      return res.status(404).send('Vendor not found');
    }

    return res.redirect('/vendors');
  });
};

exports.deleteVendor = (req, res) => {
  const id = Number(req.params.id);

  productModel.getVendorById(id, (vendorErr, vendor) => {
    if (vendorErr) {
      return res.status(500).send('Failed to load vendor');
    }
    if (!vendor) {
      return res.status(404).send('Vendor not found');
    }
    if (vendor.name === 'SATTLINK') {
      return renderNotification(res, 'Delete Blocked', 'Default vendor SATTLINK cannot be deleted.');
    }

    productModel.countProductsByVendorId(id, (countErr, count) => {
      if (countErr) {
        return res.status(500).send('Failed to validate vendor usage');
      }
      if (count > 0) {
        return renderNotification(res, 'Delete Blocked', 'Vendor is linked to one or more products. Reassign products first.');
      }

      productModel.deleteVendor(id, (deleteErr) => {
        if (deleteErr) {
          return res.status(500).send('Failed to delete vendor');
        }

        return res.redirect('/vendors');
      });
    });
  });
};

exports.showTestingMenu = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'testing', 'testing.html'));
};

exports.clearDatabase = (req, res) => {
  productModel.deleteAllProducts((err) => {
    if (err) {
      return res.status(500).send('Failed to clear database');
    }

    renderNotification(res, 'Successfully cleared Database', 'The product database has been cleared successfully.');
  });
};

exports.showTestingGeneratePage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'testing', 'generate.html'));
};

function randomHex(length) {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomDigits(length) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += String(Math.floor(Math.random() * 10));
  }
  return result;
}

function createDummyProduct(index, vendorId) {
  return {
    item: `Dummy Product ${index}`,
    specification: 'Auto Generated',
    power: 'DC 12V ⎓ 1A',
    management_ip: '192.168.1.1',
    username_password: 'user/user',
    wifi_ssid_5g: 'FTTH-5G',
    wifi_ssid_24g: 'FTTH',
    wifi_key: '12345678',
    mac: randomHex(12),
    pon_sn: `GPON${randomHex(8)}`,
    sn: `V${randomDigits(11)}`,
    vendor_id: vendorId,
    scanned_at: new Date().toISOString(),
  };
}

function insertDummyProducts(count, index, vendorId, callback) {
  if (index > count) {
    return callback(null);
  }

  const product = createDummyProduct(index, vendorId);
  productModel.createProduct(product, (err) => {
    if (err) {
      return callback(err);
    }
    insertDummyProducts(count, index + 1, vendorId, callback);
  });
}

exports.generateDummyProducts = (req, res) => {
  const count = Number(req.body.count);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return res.redirect('/testing/generate');
  }

  productModel.getDefaultVendorId((vendorErr, vendorId) => {
    if (vendorErr) {
      return res.status(500).send('Failed to load default vendor');
    }

    insertDummyProducts(count, 1, vendorId, (err) => {
      if (err) {
        return res.status(500).send('Failed to generate products');
      }

      renderNotification(res, 'Products Generated', `Generated ${count} dummy products successfully.`);
    });
  });
};


exports.showPrintPage = (req, res) => {
  const ids = parseSelectedIds(req.body.selectedIds);

  if (ids.length === 0) {
    return res.redirect('/generate');
  }

  productModel.getProductsByIds(ids, (err, products) => {
    if (err) {
      return res.status(500).send('Failed to load products for printing');
    }

    const rawJson = serializeJsonForHtml(products);
    const htmlTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'product', 'print.html'), 'utf8');
    const html = htmlTemplate.replace('{{productsJson}}', rawJson);
    res.send(html);
  });
};

exports.showEditEntry = (req, res) => {
  const id = Number(req.params.id);
  productModel.getProductById(id, (err, product) => {
    if (err) {
      return res.status(500).send('Failed to load product');
    }
    if (!product) {
      return res.status(404).send('Product not found');
    }

    productModel.getVendors('', (vendorErr, vendors) => {
      if (vendorErr) {
        return res.status(500).send('Failed to load vendors');
      }

      const template = readView('product', 'edit.html');
      const html = template
        .replace(/{{id}}/g, escapeHTML(product.id))
        .replace(/{{item}}/g, escapeHTML(product.item))
        .replace(/{{spec}}/g, escapeHTML(product.specification))
        .replace(/{{power}}/g, escapeHTML(product.power))
        .replace(/{{mgmt_ip}}/g, escapeHTML(product.management_ip))
        .replace(/{{cred}}/g, escapeHTML(product.username_password))
        .replace(/{{ssid_5g}}/g, escapeHTML(product.wifi_ssid_5g))
        .replace(/{{ssid_24g}}/g, escapeHTML(product.wifi_ssid_24g))
        .replace(/{{wifi_key}}/g, escapeHTML(product.wifi_key))
        .replace(/{{mac}}/g, escapeHTML(product.mac))
        .replace(/{{pon_sn}}/g, escapeHTML(product.pon_sn))
        .replace(/{{sn}}/g, escapeHTML(product.sn))
        .replace('{{vendorOptions}}', buildVendorOptions(vendors, product.vendor_id));

      res.send(html);
    });
  });
};

exports.submitEditEntry = (req, res) => {
  const id = Number(req.params.id);
  resolveVendorId(req.body.vendor_id, (vendorErr, vendorId) => {
    if (vendorErr) {
      return res.status(500).send('Failed to resolve vendor');
    }

    const product = {
      item: req.body.item,
      specification: req.body.spec,
      power: req.body.power,
      management_ip: req.body.mgmt_ip,
      username_password: req.body.cred,
      wifi_ssid_5g: req.body.ssid_5g,
      wifi_ssid_24g: req.body.ssid_24g,
      wifi_key: req.body.wifi_key,
      mac: req.body.mac,
      pon_sn: req.body.pon_sn,
      sn: req.body.sn,
      vendor_id: vendorId,
    };

    productModel.getProductById(id, (err, existing) => {
      if (err) {
        return res.status(500).send('Failed to load product');
      }
      if (!existing) {
        return res.status(404).send('Product not found');
      }

      const isSame =
        existing.item === product.item &&
        existing.specification === product.specification &&
        existing.power === product.power &&
        existing.management_ip === product.management_ip &&
        existing.username_password === product.username_password &&
        existing.wifi_ssid_5g === product.wifi_ssid_5g &&
        existing.wifi_ssid_24g === product.wifi_ssid_24g &&
        existing.wifi_key === product.wifi_key &&
        (existing.mac || '') === (product.mac || '') &&
        (existing.pon_sn || '') === (product.pon_sn || '') &&
        (existing.sn || '') === (product.sn || '') &&
        normalizeVendorId(existing.vendor_id) === normalizeVendorId(product.vendor_id);

      if (isSame) {
        return res.send('<p>No changes were made.</p><p><a href="/modify">Back to Modify Product Entry</a></p>');
      }

      productModel.findDuplicate(product, id, (duplicateErr, duplicate) => {
        if (duplicateErr) {
          return res.status(500).send('Database error');
        }
        if (duplicate) {
          return res.send('<p>Warning: Duplicate product with matching MAC, PON S/N, or S/N already exists.</p><p><a href="/edit/' + id + '">Back to Edit</a></p>');
        }

        productModel.updateProduct(id, product, (updateErr) => {
          if (updateErr) {
            return res.status(500).send('Failed to update product');
          }
          renderNotification(res, 'Product Updated', 'Product updated successfully.');
        });
      });
    });
  });
};
