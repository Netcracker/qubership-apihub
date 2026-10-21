#!/usr/bin/env python3
"""Export the capability model (model.py) as JSON.

The default output is the data file of the landing site, `sites/landing/src/data/capability-model.json`.
Pass `--out model.json` to write the copy that the deck generators (`gen.js`, `gen_pptx.js`) read from
their current folder.
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]
DEFAULT_OUT = REPO_ROOT / 'sites' / 'landing' / 'src' / 'data' / 'capability-model.json'

# Key order is part of the contract: the landing site and the decks read these names.
EXPORTED_KEYS = [
    'CONTAINERS', 'MATURITY', 'CAPABILITIES', 'TIERS', 'ACTORS', 'BUSINESS_SERVICES', 'APP_SERVICES',
    'NODES', 'CAP_TO_SERVICE', 'COMPONENT_TO_NODE', 'ACTOR_SERVICE',
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--out', type=Path, default=DEFAULT_OUT,
                        help='output file (default: %(default)s)')
    args = parser.parse_args()

    sys.path.insert(0, str(HERE))
    import model  # noqa: E402

    data = {key: getattr(model, key) for key in EXPORTED_KEYS}
    out = args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    # indent=1 and ASCII escapes match the existing file byte for byte; no trailing newline.
    out.write_text(json.dumps(data, indent=1), encoding='utf-8', newline='\n')
    print(f'wrote {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
