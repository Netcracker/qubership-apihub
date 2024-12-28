/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = {
  launch: {
    defaultViewport: null,
    headless: true,
    // slowMo: 500,
    devtools: false,
    args: [
      '--window-size=1800,1000',
      '--disable-resize-lock=true',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-client-side-phishing-detection',
      '--disable-backgrounding-occluded-windows',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--disable-setuid-sandbox',
      '--disable-font-antialiasing',
      '--force-device-scale-factor',
      '--disable-accelerated-2d-canvas',
      '--font-render-hinting=none',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--enable-automation',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      '--force-color-profile=srgb',
      '--disable-web-security',
      '--disable-dev-shm-usage'
    ]
  }
}
