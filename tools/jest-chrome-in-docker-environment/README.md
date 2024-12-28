# qubership-apihub-jest-chrome-in-docker-environment
This jest environment implementation provides ability to run Chrome browser in absolutely identical environments on different machines as on CI as well as user PC.
The main goal of this component is to run screenshot tests insensitive to OS, version of browser, etc.
The suggested way is using the same docker image with preinstalled Chrome browser and >
1. to use it to run testing pipelines on CI
2. to use it to run Chrome browser under it on local PC. 
`Jest Chrome in Docker Environment` really simplifies it because all steps with interaction with Docker and Chrome are hidden.

## API
### Function `prepareJestConfig`
```typescript
prepareJestConfig(pathToJestConfigOverrides: string, pathToPuppeteerLaunchOptions: string, options: Options)
```
here 
* `pathToJestConfigOverrides` is an absolute path to a file that conforms to format of [Jest Configuration](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig). 
   But you must not specify properties `globalSetup`, `globalTeardown`, `testEnvironment`, `preset` because they will be redefined anyway.
   And it is not necessary to set up following properties, because they have defaults:

  | Name                 | Default              |
  |----------------------|----------------------|
  | testRunner           | jest-circus/runner   |
  | reporters            | ["default"]          |
  | moduleFileExtensions | ["ts", "js", "json"] |  
  Example:
  ```javascript
  // 2. Create common jest configuration settings (e. g. `common-it-test.jest.config.js`) for running on CI and local PC. See example in API.
  module.exports = {
    rootDir: "../..",
    testMatch: ["**/*.it-test.ts"],
    roots: process.env.TEST_COMPONENT_NAME
        ? [
            `<rootDir>/packages/${process.env.TEST_COMPONENT_NAME}`
        ]
        : [
            "<rootDir>/packages/device-component",
            "<rootDir>/packages/floor-component",
            "<rootDir>/packages/rack-component"
        ],
    setupFilesAfterEnv: ["<rootDir>/.jest/setup.tests.ts"],
    transform: {
        "\\.ts?$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/.config/it/tsconfig.it-test.json"
            }
        ]
    }
  }
  ```
* `pathToPuppeteerLaunchOptions` is an absolute path to a file that conforms to format of [PuppeteerLaunchOptions](https://pptr.dev/api/puppeteer.puppeteerlaunchoptions).
  But some default values defer from puppeteers API:
 
  | Name     | Default |
  |----------|---------|
  | headless | true    |
  Also, you should not specify all Chrome arguments in section `args` but only those that you want to add in addition to default values: [default](https://github.com/Netcracker/qubership-apihub-jest-chrome-in-docker-environment/blob/main/src/lib/core/defaults.ts).  
  Example:
  ```javascript
  module.exports = {
     headless: false,
     slowMo: 500,
     devtools: true,
     args: [
        "--js-flags=\"--max_old_space_size=8000 --max_semi_space_size=8000 --random-seed=1157259157\""
     ]
  }
  ```
* Options:
  ```typescript
  {
    dockerImage?: string; // if it is specified tests will be run under browser inside docker container
    dockerBinary?:string; // specifies path do Docker binary. For example it can be 'podman' or 'C:\\Program Files\\RedHat\\Podman\\podman.exe'
    nodeBinary?:string;   // specifies path do Node.js binary.
  }
  ```

## Usage
1. Install it
`npm install --save-dev @netcracker/qubership-apihub-jest-chrome-in-docker-environment@version`
2. Create common jest configuration settings (e. g. `common-it-test.jest.config.js`) for running on CI and local PC. See example in API section.
3. Create common puppeteer configuration settings (e. g. `common-puppeteer.config.js`) for running on CI and local PC. See example in API section.
4. Create jest config for running on CI
    ```javascript
    // it-test.jest.config.js
    const path = require("path");
    const {prepareJestConfig} = require("@netcracker/qubership-apihub-jest-chrome-in-docker-environment");
    module.exports = prepareJestConfig(
       path.resolve(__dirname, "./common-it-test.jest.config.js"),  // <--- common jest configuration settings
       path.resolve(__dirname, "./common-puppeteer.config.js"), // <--- common puppeteer configuration settings
    )
    ```
    the common settings `common-it-test.jest.config.js` are described above
5. Create jest config for running on local PC in docker
    ```javascript
    // it-test-docker.jest.config.js
    const path = require("path");
    const {prepareJestConfig} = require("@netcracker/qubership-apihub-jest-chrome-in-docker-environment");
    module.exports = prepareJestConfig(
       path.resolve(__dirname, "./common-it-test.jest.config.js"),  // <--- common jest configuration settings
       path.resolve(__dirname, "./common-puppeteer.config.js"), // <--- common puppeteer configuration settings
       { 
          // TODO 27.12.24 // Set proper image and version
          dockerImage: "qubership-apihub-nodejs-dev-image:1.7.3"
          // dockerBinary: "podman",
          // nodeBinary: "C:\\Users\\UserName\\AppData\\Local\\nvs\\node\\20.11.1\\x64\\node.exe",
       }
    )
    ```
    the common settings `common-it-test.jest.config.js` are described above
6. Use paths to created jest configuration files in `scripts` section of `package.json` like is here:
   ```json
   {
     ...
     "scripts": {
       ...
       "integration-test:local:run": "jest --maxWorkers 4 -c .config/it/it-test-docker.jest.config.js",
       "integration-test:ci:run": "jest --maxWorkers 4 -c .config/it/it-test.jest.config.js",
       ...
     },
     ...
   }
   ```
7. Use `await page.goto(http://${process.env.HOST_ADDRESS}:9009?path=/story/xyz, ...);` if local server is up on host machine 

## Environment variables that can be used to control the behaviour of `qubership-apihub-jest-chrome-in-docker-environment`
| Name                             | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
|----------------------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| HOST_CHECK_PORT                  | 9009    | Port that is used to check localserver (host side) is accessible. If local server uses not default port than it must be specified explicitly using this environment variable name                                                                                                                                                                                                                                                                                                                                                                                               |
| DOCKER_BINARY                    | docker  | Name or full path of executable binary for Docker on host machine. For example it can be podman.exe                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| NODE_BINARY                      | node    | Name or full path of executable binary for Node.js on host machine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| CONNECT_TO_CHROME_MAX_ATTEMPTS   | 10      | How many attempts will be used to connect to Chrome while waiting the start                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CONNECT_TO_CHROME_RETRY_INTERVAL | 2000    | Interval between attempts of connecting to Chrome while it is starting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| DISPLAY                          | -       | By default Chrome browser fails on running in non-headless mode under docker. To make it possible define environment variable DISPLAY according to [X Window System](https://www.x.org/archive/X11R7.7/doc/man/man7/X.7.xhtml#heading5) conventions. In windows you would have to install separate X Server like `VcXsrv Windows X Server`  </br></br> _Example:_ </br>`export DISPLAY=172.28.16.1:0` </br></br> _See also:_ </br> - https://help.ubuntu.com/community/EnvironmentVariables#Graphical_desktop-related_variables </br> - https://datacadamia.com/ssh/x11/display |


## Environment variables are exposed by environment
| Name         | Description                                                                                                                                                                                                                                                                                    |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| HOST_ADDRESS | The host address associated with the interface known to Chrome which is run in this environment. It can be safely used to open pages from a server deployed on the host machine. <br/> Example: <br/>```await page.goto(`http://${process.env.HOST_ADDRESS}:9009?path=/story/xyz`, ...);```    |
