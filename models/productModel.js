const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const DEFAULT_VENDOR_NAME = 'SATTLINK';

function getDb(callback) {
  const db = new sqlite3.Database(dbPath, (err) => {
    callback(err, db);
  });
}

function getTableColumns(db, tableName, callback) {
  db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
    if (err) {
      return callback(err);
    }
    callback(null, (rows || []).map((row) => row.name));
  });
}

function ensureProductColumns(db, callback) {
  getTableColumns(db, 'products', (err, columns) => {
    if (err) {
      return callback(err);
    }

    const statements = [];
    if (!columns.includes('vendor_id')) {
      statements.push('ALTER TABLE products ADD COLUMN vendor_id INTEGER');
    }
    if (!columns.includes('scanned_at')) {
      statements.push('ALTER TABLE products ADD COLUMN scanned_at TEXT');
    }

    if (statements.length === 0) {
      return callback(null);
    }

    let index = 0;
    const runNext = () => {
      if (index >= statements.length) {
        return callback(null);
      }

      db.run(statements[index], (statementError) => {
        if (statementError) {
          return callback(statementError);
        }
        index += 1;
        runNext();
      });
    };

    runNext();
  });
}

function ensureReportTables(db, callback) {
  db.run(
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_title TEXT NOT NULL,
      tested_by TEXT,
      status TEXT,
      date_in TEXT,
      date_out TEXT,
      general_remarks TEXT,
      serial_code TEXT,
      generated_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    (reportErr) => {
      if (reportErr) {
        return callback(reportErr);
      }

      db.run(
        `CREATE TABLE IF NOT EXISTS report_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id INTEGER NOT NULL,
          position INTEGER NOT NULL,
          product_id INTEGER,
          vendor_id INTEGER,
          item TEXT,
          specification TEXT,
          power TEXT,
          management_ip TEXT,
          username_password TEXT,
          wifi_ssid_5g TEXT,
          wifi_ssid_24g TEXT,
          wifi_key TEXT,
          mac TEXT,
          pon_sn TEXT,
          sn TEXT,
          power_status TEXT,
          pon_status TEXT,
          wifi_24g_status TEXT,
          wifi_5g_status TEXT,
          lan_status TEXT,
          catv_status TEXT,
          findings TEXT,
          FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
        )`,
        callback
      );
    }
  );
}

function ensureDefaultVendor(db, callback) {
  db.get('SELECT id FROM vendors WHERE name = ?', [DEFAULT_VENDOR_NAME], (err, row) => {
    if (err) {
      return callback(err);
    }
    if (row && row.id) {
      return callback(null, row.id);
    }

    db.run('INSERT INTO vendors (name) VALUES (?)', [DEFAULT_VENDOR_NAME], function (insertError) {
      if (insertError) {
        return callback(insertError);
      }
      callback(null, this.lastID);
    });
  });
}

function backfillProductDefaults(db, defaultVendorId, callback) {
  const nowIso = new Date().toISOString();
  db.run(
    'UPDATE products SET vendor_id = COALESCE(vendor_id, ?), scanned_at = COALESCE(scanned_at, ?)',
    [defaultVendorId, nowIso],
    (err) => callback(err)
  );
}

exports.initDatabase = (callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.serialize(() => {
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
        (createProductErr) => {
          if (createProductErr) {
            return db.close(() => callback(createProductErr));
          }

          db.run(
            `CREATE TABLE IF NOT EXISTS vendors (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE
            )`,
            (createVendorErr) => {
              if (createVendorErr) {
                return db.close(() => callback(createVendorErr));
              }

              ensureProductColumns(db, (columnErr) => {
                if (columnErr) {
                  return db.close(() => callback(columnErr));
                }

                ensureReportTables(db, (reportErr) => {
                  if (reportErr) {
                    return db.close(() => callback(reportErr));
                  }

                  ensureDefaultVendor(db, (vendorErr, vendorId) => {
                    if (vendorErr) {
                      return db.close(() => callback(vendorErr));
                    }

                    backfillProductDefaults(db, vendorId, (backfillErr) => {
                      db.close(() => callback(backfillErr));
                    });
                  });
                });
              });
            }
          );
        }
      );
    });
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
    sn,
    vendor_id,
    scanned_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
    product.vendor_id || null,
    product.scanned_at || null,
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

    let sql = `SELECT p.*, v.name AS vendor_name
      FROM products p
      LEFT JOIN vendors v ON v.id = p.vendor_id`;
    const params = [];
    if (searchSn) {
      sql += ' WHERE p.sn LIKE ?';
      params.push(`%${searchSn}%`);
    }
    sql += ' ORDER BY p.id';

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

    db.get(
      `SELECT p.*, v.name AS vendor_name
       FROM products p
       LEFT JOIN vendors v ON v.id = p.vendor_id
       WHERE p.id = ?`,
      [id],
      (err, row) => {
        db.close(() => callback(err, row));
      }
    );
  });
};

exports.getDefaultVendorId = (callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get('SELECT id FROM vendors WHERE name = ?', [DEFAULT_VENDOR_NAME], (queryErr, row) => {
      if (queryErr) {
        return db.close(() => callback(queryErr));
      }

      if (row && row.id) {
        return db.close(() => callback(null, row.id));
      }

      db.run('INSERT INTO vendors (name) VALUES (?)', [DEFAULT_VENDOR_NAME], function (insertErr) {
        db.close(() => callback(insertErr, this ? this.lastID : null));
      });
    });
  });
};

exports.getProductsByIds = (ids, callback) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return callback(null, []);
  }

  const placeholders = ids.map(() => '?').join(',');
  const orderByCase = ids.map(() => 'WHEN ? THEN ?').join(' ');
  const orderParams = [];
  ids.forEach((id, index) => {
    orderParams.push(id, index);
  });

  const sql = `SELECT p.*, v.name AS vendor_name
    FROM products p
    LEFT JOIN vendors v ON v.id = p.vendor_id
    WHERE p.id IN (${placeholders})
    ORDER BY CASE p.id ${orderByCase} ELSE 999999 END`;

  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.all(sql, [...ids, ...orderParams], (queryErr, rows) => {
      db.close(() => callback(queryErr, rows));
    });
  });
};

exports.getVendors = (searchName, callback) => {
  if (typeof callback === 'undefined') {
    callback = searchName;
    searchName = '';
  }

  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    let sql = 'SELECT id, name FROM vendors';
    const params = [];
    if (searchName) {
      sql += ' WHERE name LIKE ?';
      params.push(`%${searchName}%`);
    }
    sql += ' ORDER BY name COLLATE NOCASE, id';

    db.all(sql, params, (queryErr, rows) => {
      db.close(() => callback(queryErr, rows));
    });
  });
};

exports.getVendorById = (id, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get('SELECT id, name FROM vendors WHERE id = ?', [id], (queryErr, row) => {
      db.close(() => callback(queryErr, row));
    });
  });
};

exports.getVendorByName = (name, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get('SELECT id, name FROM vendors WHERE name = ?', [name], (queryErr, row) => {
      db.close(() => callback(queryErr, row));
    });
  });
};

exports.getVendorCount = (callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get('SELECT COUNT(*) AS count FROM vendors', (queryErr, row) => {
      db.close(() => callback(queryErr, row ? row.count : 0));
    });
  });
};

exports.createVendor = (name, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run('INSERT INTO vendors (name) VALUES (?)', [name], function (queryErr) {
      db.close(() => callback(queryErr, this ? this.lastID : null));
    });
  });
};

exports.updateVendor = (id, name, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run('UPDATE vendors SET name = ? WHERE id = ?', [name, id], function (queryErr) {
      db.close(() => callback(queryErr, this ? this.changes : 0));
    });
  });
};

exports.countProductsByVendorId = (vendorId, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get('SELECT COUNT(*) AS count FROM products WHERE vendor_id = ?', [vendorId], (queryErr, row) => {
      db.close(() => callback(queryErr, row ? row.count : 0));
    });
  });
};

function insertReportHeader(db, report, callback) {
  const sql = `INSERT INTO reports (
    report_title,
    tested_by,
    status,
    date_in,
    date_out,
    general_remarks,
    serial_code,
    generated_at,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    report.report_title,
    report.tested_by || null,
    report.status || null,
    report.date_in || null,
    report.date_out || null,
    report.general_remarks || null,
    report.serial_code || null,
    report.generated_at,
    report.updated_at,
  ];

  db.run(sql, params, function (err) {
    callback(err, this ? this.lastID : null);
  });
}

function insertReportItems(db, reportId, items, callback) {
  if (!Array.isArray(items) || items.length === 0) {
    return callback(null);
  }

  const sql = `INSERT INTO report_items (
    report_id,
    position,
    product_id,
    vendor_id,
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
    sn,
    power_status,
    pon_status,
    wifi_24g_status,
    wifi_5g_status,
    lan_status,
    catv_status,
    findings
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  let index = 0;
  const runNext = () => {
    if (index >= items.length) {
      return callback(null);
    }

    const item = items[index];
    db.run(
      sql,
      [
        reportId,
        Number.isInteger(item.position) ? item.position : index + 1,
        item.product_id || null,
        item.vendor_id || null,
        item.item || null,
        item.specification || null,
        item.power || null,
        item.management_ip || null,
        item.username_password || null,
        item.wifi_ssid_5g || null,
        item.wifi_ssid_24g || null,
        item.wifi_key || null,
        item.mac || null,
        item.pon_sn || null,
        item.sn || null,
        item.power_status || null,
        item.pon_status || null,
        item.wifi_24g_status || null,
        item.wifi_5g_status || null,
        item.lan_status || null,
        item.catv_status || null,
        item.findings || null,
      ],
      (err) => {
        if (err) {
          return callback(err);
        }
        index += 1;
        runNext();
      }
    );
  };

  runNext();
}

exports.createReport = (report, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run('BEGIN TRANSACTION', (beginErr) => {
      if (beginErr) {
        return db.close(() => callback(beginErr));
      }

      insertReportHeader(db, report, (headerErr, reportId) => {
        if (headerErr) {
          return db.run('ROLLBACK', () => db.close(() => callback(headerErr)));
        }

        insertReportItems(db, reportId, report.items || [], (itemsErr) => {
          if (itemsErr) {
            return db.run('ROLLBACK', () => db.close(() => callback(itemsErr)));
          }

          db.run('COMMIT', (commitErr) => {
            db.close(() => callback(commitErr, reportId));
          });
        });
      });
    });
  });
};

exports.createReportItems = (reportId, items, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    insertReportItems(db, reportId, items, (insertErr) => {
      db.close(() => callback(insertErr));
    });
  });
};

exports.getReports = (callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.all(
      `SELECT id, report_title, tested_by, status, date_in, date_out, general_remarks, serial_code, generated_at, updated_at
       FROM reports
       ORDER BY datetime(generated_at) DESC, id DESC`,
      (queryErr, rows) => {
        db.close(() => callback(queryErr, rows));
      }
    );
  });
};

exports.getReportById = (id, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.get(
      `SELECT id, report_title, tested_by, status, date_in, date_out, general_remarks, serial_code, generated_at, updated_at
       FROM reports
       WHERE id = ?`,
      [id],
      (queryErr, row) => {
        db.close(() => callback(queryErr, row));
      }
    );
  });
};

exports.getReportItemsByReportId = (reportId, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.all(
      `SELECT ri.id, ri.report_id, ri.position, ri.product_id, ri.vendor_id, v.name AS vendor_name, ri.item, ri.specification, ri.power, ri.management_ip, ri.username_password,
              ri.wifi_ssid_5g, ri.wifi_ssid_24g, ri.wifi_key, ri.mac, ri.pon_sn, ri.sn, ri.power_status, ri.pon_status, ri.wifi_24g_status,
              ri.wifi_5g_status, ri.lan_status, ri.catv_status, ri.findings
       FROM report_items ri
       LEFT JOIN vendors v ON v.id = ri.vendor_id
       WHERE report_id = ?
       ORDER BY position, ri.id`,
      [reportId],
      (queryErr, rows) => {
        db.close(() => callback(queryErr, rows));
      }
    );
  });
};

exports.deleteVendor = (id, callback) => {
  getDb((err, db) => {
    if (err) {
      return callback(err);
    }

    db.run('DELETE FROM vendors WHERE id = ?', [id], function (queryErr) {
      db.close(() => callback(queryErr, this ? this.changes : 0));
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
    sn = ?,
    vendor_id = ?
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
    product.vendor_id || null,
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
