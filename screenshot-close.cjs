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
  // Move camera close to a trunk
  await page.evaluate(() => {
    if (window.__camera && window.__controls) {
      window.__camera.position.set(0.4, 0.8, 0.8);
      window.__controls.target.set(0, 0.6, 0);
      window.__controls.update();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  const outPath = process.argv[2] || '/tmp/shapecraft-close.png';
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log('Saved:', outPath);
})();
