# Contribution Guide

We'd love to accept patches and contributions to this project.
Follow these guidelines to make the contribution process easy and effective for everyone involved.

Start with the [developer guide](docs/development/README.md). It covers the workstation setup, building, testing,
and the workflow in detail.

## Contributor License Agreement

You must sign the [Contributor License Agreement](https://pages.netcracker.com/cla-main.html) to contribute.

## Code of Conduct

Read and follow the [Code of Conduct](CODE-OF-CONDUCT.md).

## Issues first

Open an issue in this repository before you start, and describe the problem or the feature. A small fix such as a typo
needs no issue.

## Pull requests

1. Title the pull request as a [Conventional Commit](https://www.conventionalcommits.org/) (`type(scope): summary`).
   The pull request is squash-merged, and the title becomes the commit message.
2. Link the issue under Development, or write `Closes #<number>` in the description.
3. Update the documentation in the same pull request.
4. Make the `ci-ok` check green.
5. Get a review from the code owners listed in [`.github/CODEOWNERS`](.github/CODEOWNERS).

The [workflow guide](docs/development/workflow.md) explains branch names, labels, and breaking changes.
