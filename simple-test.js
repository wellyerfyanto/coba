// SIMPLE TEST - hanya log dan delay
console.log('🧪 [TEST] Starting minimal app at:', new Date().toISOString());
console.log('🧪 [TEST] PORT from env:', process.env.PORT);

// Buat server HTTP minimal
require('http').createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(process.env.PORT || 8080, () => {
  console.log('✅ [TEST] Server listening');
});

// Tahan proses
setInterval(() => {
  console.log('❤️ [TEST] Heartbeat at', new Date().toISOString());
}, 30000);
