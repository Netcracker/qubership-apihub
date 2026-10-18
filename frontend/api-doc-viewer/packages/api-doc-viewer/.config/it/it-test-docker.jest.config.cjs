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

const path = require('path')
const { prepareJestConfig } = require('@netcracker/qubership-apihub-jest-chrome-in-docker-environment')

module.exports = prepareJestConfig(
  path.resolve(__dirname, './common-it-test.jest.config.cjs'),
  path.resolve(__dirname, './common-puppeteer.config.cjs'),
  {
    // Pinned by DIGEST, not just by tag, because this string is an Nx cache input.
    //
    // `screenshot-test` is cacheable, and its hash covers {projectRoot}/**/* — which includes
    // this file. So bumping 1.9.0 to a new version busts the cache automatically, which is
    // exactly what should happen. A TAG does not give that guarantee: ghcr tags are mutable,
    // and a re-push of 1.9.0 would change the browser under the tests without changing a byte
    // Nx can see, leaving a cached pass standing for an environment that no longer exists.
    //
    // The tag is kept alongside the digest for readability. Docker resolves by digest and
    // ignores the tag; the image string is passed verbatim to `docker run` (see
    // tools/jest-chrome-in-docker-environment/src/lib/core/docker-chrome.ts), so nothing
    // parses or splits it. Digest verified against ghcr: :1.9.0 and this digest return a
    // byte-identical manifest.
    //
    // To move to a new image: change the tag AND the digest together. They are one fact.
    dockerImage: 'ghcr.io/netcracker/qubership-apihub-nodejs-dev-image:1.9.0@sha256:ea5cb0ea40f498a4768d5934fa86a52aeb78908bc0bc3e717ee6b5ebf8a4e1a5',
  },
)
