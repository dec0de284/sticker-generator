const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const indexRouter = require('./routes');
const productModel = require('./models/productModel');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);

productModel.initDatabase((err) => {
  if (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
  });
});
