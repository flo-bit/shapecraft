const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => { if(msg.type()==='error') console.log('ERR:', msg.text()) });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  const outPath = process.argv[2] || '/tmp/shapecraft-screenshot.png';
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log('Saved:', outPath);
})();
