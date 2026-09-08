const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');
const candidates = [process.env.LINELENS_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
const executablePath = candidates.find(path => fs.existsSync(path));

module.exports = defineConfig({
    testDir: './tests/ui', timeout: 60000, workers: 1,
    outputDir: './artifacts/editorial-tests',
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:4175',
        viewport: { width: 1440, height: 1000 },
        timezoneId: 'America/Toronto',
        launchOptions: executablePath ? { executablePath } : {},
        screenshot: 'only-on-failure', trace: 'retain-on-failure',
    },
    webServer: {
        command: 'python -m http.server 4175 --bind 127.0.0.1 --directory dist-web',
        url: 'http://127.0.0.1:4175', reuseExistingServer: !process.env.CI,
        stdout: 'ignore', stderr: 'ignore',
    },
});
