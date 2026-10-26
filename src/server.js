require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`)))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
