const app = require('./src/app');

const PORT = process.env.PORT || 4005;

app.listen(PORT, () => {
  console.log(`🕵️  Codebase Detective API listening on http://localhost:${PORT}`);
});
