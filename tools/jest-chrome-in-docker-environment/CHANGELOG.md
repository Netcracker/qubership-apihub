# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## `Jest Chrome in Docker Environment`

## [1.0.2] - 2024-05-30

### Fixed

- Environment variables `HOST_CHECK_PORT`, `CONNECT_TO_CHROME_MAX_ATTEMPTS`, `CONNECT_TO_CHROME_RETRY_INTERVAL` do not work
- Change value of `CONNECT_TO_CHROME_RETRY_INTERVAL` to 2000

## [1.0.1] - 2024-05-02

### Added

- [API] methods: `prepareJestConfig`
- [API] Input Environment Variables: `HOST_CHECK_PORT`, `CONNECT_TO_CHROME_MAX_ATTEMPTS`, `CONNECT_TO_CHROME_RETRY_INTERVAL`, `DISPLAY`
- [API] Output Environment Variables: `HOST_ADDRESS`
