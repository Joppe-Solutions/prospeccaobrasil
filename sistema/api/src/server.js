const { app } = require('./app');

const PORT = process.env.PORT || 8090;
app.listen(PORT, () => console.log(`API Prospecção Brasil na porta ${PORT}`));
