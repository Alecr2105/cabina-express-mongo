const express = require('express');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bands', require('./routes/bands'));
app.use('/api/musicians', require('./routes/musicians'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/loans', require('./routes/loans'));
// TODO: app.use('/api/bookings', require('./routes/bookings'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
