import { ConnectOptions, LaunchOptions } from "puppeteer"

export type ChromeArg = `--${string}`
export type JestPuppeteerConfig = {launch: LaunchOptions & {args: ChromeArg[]}} & {connect: ConnectOptions & {args: ChromeArg[]}}