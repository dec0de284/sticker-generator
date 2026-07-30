const fs = require('fs');
const path = require('path');
const productModel = require('../models/productModel');

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

exports.showRegistration = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'product', 'register.html'));
};

exports.submitRegistration = (req, res) => {
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
  };

  productModel.findDuplicate(product, null, (err, row) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    if (row) {
      return res.send('<p>Warning: Duplicate product with matching MAC, PON S/N, or S/N already exists.</p><p><a href="/register">Back to Register</a></p>');
    }

    productModel.createProduct(product, (err) => {
      if (err) {
        return res.status(500).send('Failed to save product');
      }
      renderNotification(res, 'Product Registered', 'Product registered successfully.');
    });
  });
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

    const htmlTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'product', 'modify.html'), 'utf8');
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

    const rawJson = JSON.stringify(products).replace(/</g, '\u003c');
    const htmlTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'product', 'generate.html'), 'utf8');
    const html = htmlTemplate.replace('{{productsJson}}', rawJson);
    res.send(html);
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

function createDummyProduct(index) {
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
  };
}

function insertDummyProducts(count, index, callback) {
  if (index > count) {
    return callback(null);
  }

  const product = createDummyProduct(index);
  productModel.createProduct(product, (err) => {
    if (err) {
      return callback(err);
    }
    insertDummyProducts(count, index + 1, callback);
  });
}

exports.generateDummyProducts = (req, res) => {
  const count = Number(req.body.count);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return res.redirect('/testing/generate');
  }

  insertDummyProducts(count, 1, (err) => {
    if (err) {
      return res.status(500).send('Failed to generate products');
    }

    renderNotification(res, 'Products Generated', `Generated ${count} dummy products successfully.`);
  });
};


exports.showPrintPage = (req, res) => {
  const rawIds = (req.body.selectedIds || '').split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0);
  const ids = Array.from(new Set(rawIds)).slice(0, 14);

  if (ids.length === 0) {
    return res.redirect('/generate');
  }

  productModel.getProductsByIds(ids, (err, products) => {
    if (err) {
      return res.status(500).send('Failed to load products for printing');
    }

    const rawJson = JSON.stringify(products).replace(/</g, '\u003c');
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

    const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'product', 'edit.html'), 'utf8');
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
      .replace(/{{sn}}/g, escapeHTML(product.sn));

    res.send(html);
  });
};

exports.submitEditEntry = (req, res) => {
  const id = Number(req.params.id);
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
      (existing.sn || '') === (product.sn || '');

    if (isSame) {
      return res.send('<p>No changes were made.</p><p><a href="/modify">Back to Modify Product Entry</a></p>');
    }

    productModel.findDuplicate(product, id, (err, duplicate) => {
      if (err) {
        return res.status(500).send('Database error');
      }
      if (duplicate) {
        return res.send('<p>Warning: Duplicate product with matching MAC, PON S/N, or S/N already exists.</p><p><a href="/edit/' + id + '">Back to Edit</a></p>');
      }

      productModel.updateProduct(id, product, (err) => {
        if (err) {
          return res.status(500).send('Failed to update product');
        }
        renderNotification(res, 'Product Updated', 'Product updated successfully.');
      });
    });
  });
};
