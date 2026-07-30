const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const indexRouter = require('./routes');
const productModel = require('./models/productModel');

app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter);

productModel.initDatabase((err) => {
  if (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
});
