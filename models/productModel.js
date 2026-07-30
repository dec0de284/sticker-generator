const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database.sqlite');

function getDb(callback) {
  const db = new sqlite3.Database(dbPath, (err) => {
    callback(err, db);
  });
}

exports.initDatabase = (callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run(
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        specification TEXT NOT NULL,
        power TEXT NOT NULL,
        management_ip TEXT NOT NULL,
        username_password TEXT NOT NULL,
        wifi_ssid_5g TEXT NOT NULL,
        wifi_ssid_24g TEXT NOT NULL,
        wifi_key TEXT NOT NULL,
        mac TEXT UNIQUE,
        pon_sn TEXT UNIQUE,
        sn TEXT UNIQUE
      )`,
      (err) => {
        db.close(() => callback(err));
      }
    );
  });
};

exports.findDuplicate = (product, excludeId, callback) => {
  const conditions = [];
  const params = [];

  if (product.mac) {
    conditions.push('mac = ?');
    params.push(product.mac);
  }
  if (product.pon_sn) {
    conditions.push('pon_sn = ?');
    params.push(product.pon_sn);
  }
  if (product.sn) {
    conditions.push('sn = ?');
    params.push(product.sn);
  }

  if (conditions.length === 0) {
    return callback(null, null);
  }

  let sql = `SELECT * FROM products WHERE ${conditions.join(' OR ')}`;
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get(sql, params, (err, row) => {
      db.close(() => callback(err, row));
    });
  });
};

exports.createProduct = (product, callback) => {
  const sql = `INSERT INTO products (
    item,
    specification,
    power,
    management_ip,
    username_password,
    wifi_ssid_5g,
    wifi_ssid_24g,
    wifi_key,
    mac,
    pon_sn,
    sn
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    product.item,
    product.specification,
    product.power,
    product.management_ip,
    product.username_password,
    product.wifi_ssid_5g,
    product.wifi_ssid_24g,
    product.wifi_key,
    product.mac || null,
    product.pon_sn || null,
    product.sn || null,
  ];

  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run(sql, params, function (err) {
      db.close(() => callback(err, this.lastID));
    });
  });
};

exports.getAllProducts = (searchSn, callback) => {
  if (typeof callback === 'undefined') {
    callback = searchSn;
    searchSn = '';
  }

  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    let sql = 'SELECT * FROM products';
    const params = [];
    if (searchSn) {
      sql += ' WHERE sn LIKE ?';
      params.push(`%${searchSn}%`);
    }
    sql += ' ORDER BY id';

    db.all(sql, params, (err, rows) => {
      db.close(() => callback(err, rows));
    });
  });
};

exports.getProductById = (id, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      db.close(() => callback(err, row));
    });
  });
};

exports.getProductsByIds = (ids, callback) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return callback(null, []);
  }

  const placeholders = ids.map(() => '?').join(',');
  const sql = `SELECT * FROM products WHERE id IN (${placeholders}) ORDER BY id`;

  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.all(sql, ids, (err, rows) => {
      db.close(() => callback(err, rows));
    });
  });
};

exports.updateProduct = (id, product, callback) => {
  const sql = `UPDATE products SET
    item = ?,
    specification = ?,
    power = ?,
    management_ip = ?,
    username_password = ?,
    wifi_ssid_5g = ?,
    wifi_ssid_24g = ?,
    wifi_key = ?,
    mac = ?,
    pon_sn = ?,
    sn = ?
    WHERE id = ?`;

  const params = [
    product.item,
    product.specification,
    product.power,
    product.management_ip,
    product.username_password,
    product.wifi_ssid_5g,
    product.wifi_ssid_24g,
    product.wifi_key,
    product.mac || null,
    product.pon_sn || null,
    product.sn || null,
    id,
  ];

  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run(sql, params, function (err) {
      db.close(() => callback(err, this.changes));
    });
  });
};

exports.deleteAllProducts = (callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run('DELETE FROM products', (err) => {
      db.close(() => callback(err));
    });
  });
};
