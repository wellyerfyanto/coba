// Uji platform Railway: apakah bisa menjalankan proses lebih dari 2 detik?
console.log('=== RAILWAY PLATFORM TEST START ===');
console.log('Start Time:', new Date().toISOString());
console.log('Node Version:', process.version);

// Tahan proses selamanya
setInterval(() => {
  console.log('Platform Test - Still running at:', new Date().toISOString());
}, 5000);

// Tangkap sinyal
process.on('SIGTERM', () => {
  console.error('=== TEST FAILED: SIGTERM received ===');
  console.error('Total Uptime:', process.uptime(), 'seconds');
  process.exit(1);
});
