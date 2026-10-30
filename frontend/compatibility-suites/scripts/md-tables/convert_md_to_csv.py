#!/usr/bin/env python3

import csv
import json
import re
from pathlib import Path

# Placeholder to replace tables in templates
TABLE_PLACEHOLDER = "{{TABLE_PLACEHOLDER}}"
CONFIG_FILE = "config.json"
TEMP_FOLDER = "__script_temp"


def find_table_bounds(lines):
    """
    Find the start and end line indices of the markdown table.

    Returns:
        tuple: (start_line, end_line) or (None, None) if no table found
    """
    start_line = None
    end_line = None
    in_table = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Check if this line looks like a table row (starts and ends with |)
        if stripped.startswith('|') and stripped.endswith('|'):
            # Check if it's a separator row (contains only dashes/spaces)
            is_separator = all(re.match(r'^[\s-]+$', cell.strip())
                              for cell in stripped[1:-1].split('|'))

            if not is_separator:
                if start_line is None:
                    start_line = i
                in_table = True
                end_line = i + 1
            elif in_table:
                # This is a separator row, continue
                end_line = i + 1
        elif in_table:
            # We were in a table but this line is not a table row
            # The table ended at the previous line
            break

    return (start_line, end_line) if start_line is not None else (None, None)


def markdown_table_to_csv_rows(md_lines, start_line, end_line):
    """
    Extract table rows from markdown lines and convert to CSV format.

    Args:
        md_lines: List of all markdown lines
        start_line: Start line index of the table
        end_line: End line index of the table (exclusive)

    Returns:
        list: List of rows (each row is a list of cells)
    """
    rows = []
    num_columns = None

    for i in range(start_line, end_line):
        line = md_lines[i].strip()

        if not line or not (line.startswith('|') and line.endswith('|')):
            continue

        # Remove leading and trailing pipes, but preserve the structure
        # We need to split including empty cells
        line_content = line[1:-1]  # Remove outer pipes but keep inner structure

        # Split by | - this will preserve empty cells
        cells = [cell.strip() for cell in line_content.split('|')]

        # Skip separator rows (rows that contain only dashes and spaces)
        if all(re.match(r'^[\s-]+$', cell) for cell in cells):
            continue

        # Determine number of columns from the first data row (header)
        if num_columns is None:
            num_columns = len(cells)

        # Ensure all rows have the same number of columns as the header
        # Pad with empty strings if needed, or truncate if too many
        while len(cells) < num_columns:
            cells.append("")
        cells = cells[:num_columns]

        if cells:  # Only add non-empty rows
            rows.append(cells)

    return rows


def create_template(md_lines, start_line, end_line):
    """
    Create a template by replacing the table with a placeholder.

    Args:
        md_lines: List of all markdown lines
        start_line: Start line index of the table
        end_line: End line index of the table (exclusive)

    Returns:
        str: Template content with placeholder
    """
    # Get content before table
    before_table = md_lines[:start_line]

    # Get content after table
    after_table = md_lines[end_line:]

    # Combine with placeholder
    template_lines = before_table + [TABLE_PLACEHOLDER + "\n"] + after_table

    return "".join(template_lines)


def load_config(script_dir):
    """
    Load configuration from config.json file.

    Returns:
        list: List of file names (without extension) to process, or ['all'] for all files
    """
    config_path = script_dir / CONFIG_FILE
    if not config_path.exists():
        print(f"[WARNING] Config file {CONFIG_FILE} not found. Processing all files.")
        return ['all']

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        files_to_process = config.get('files_to_process', ['all'])
        return files_to_process
    except Exception as e:
        print(f"[WARNING] Error reading config file: {e}. Processing all files.")
        return ['all']


def find_docs_md_files(script_dir):
    """
    Return the docs directory and {file name without extension: path} for the Markdown files under it.

    `docs_dir` in the config is relative to the config file and points at docs/reference/api-changes/. The index
    README.md and the generated *_template.md files are skipped.
    """
    docs_dir = "../../../../docs/reference/api-changes"
    try:
        with open(script_dir / CONFIG_FILE, 'r', encoding='utf-8') as f:
            docs_dir = json.load(f).get('docs_dir', docs_dir)
    except Exception:
        pass
    root = (script_dir / docs_dir).resolve()
    return root, {
        p.stem: p for p in sorted(root.rglob("*.md"))
        if p.name != "README.md" and not p.name.endswith("_template.md")
    }


def should_process_file(file_path, files_to_process):
    """
    Check if a file should be processed based on configuration.

    Args:
        file_path: Path to the file
        files_to_process: List of file names to process or ['all']

    Returns:
        bool: True if file should be processed
    """
    if 'all' in files_to_process:
        return True

    file_name_without_ext = file_path.stem
    return file_name_without_ext in files_to_process


def convert_all_md_files():
    """
    Find all Markdown files in the current directory and convert them to CSV.
    Files are filtered based on config.json configuration.
    """
    # Get the directory where this script is located
    script_dir = Path(__file__).parent

    # Load configuration
    files_to_process = load_config(script_dir)

    # Create temp folder for CSV and template output (create if not exists)
    temp_dir = script_dir / TEMP_FOLDER
    temp_dir.mkdir(exist_ok=True)

    # Find all .md files under the docs directory set in the config
    docs_root, md_by_stem = find_docs_md_files(script_dir)
    md_files = list(md_by_stem.values())

    # Filter files based on configuration
    md_files = [f for f in md_files if should_process_file(f, files_to_process)]

    if not md_files:
        print(f"No Markdown files found to process in {docs_root}")
        return

    print(f"Found {len(md_files)} Markdown file(s) to convert:")

    for md_file in md_files:
        print(f"  - {md_file.name}")

        try:
            # Read the markdown file
            with open(md_file, 'r', encoding='utf-8') as f:
                md_lines = f.readlines()

            # Find table bounds
            start_line, end_line = find_table_bounds(md_lines)

            if start_line is None:
                print(f"    [WARNING] No table found in {md_file.name}")
                continue

            # Extract table rows
            rows = markdown_table_to_csv_rows(md_lines, start_line, end_line)

            if not rows:
                print(f"    [WARNING] No table data found in {md_file.name}")
                continue

            # First row is the header
            header = rows[0]
            data_rows = rows[1:]

            # Create auxiliary line with two cells:
            # - First cell: Label explaining what the second cell contains
            # - Second cell: Original headers (comma-separated)
            # This serves as a snapshot of the original column structure
            original_headers = ",".join(header)
            auxiliary_row = [
                "Column names to be included in the MD Table (comma-separated)",
                original_headers
            ]

            # Generate output filename in temp folder (same name, .csv extension)
            csv_file = temp_dir / f"{md_file.stem}.csv"

            # Write to CSV file
            with open(csv_file, 'w', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                # Write auxiliary row (first line with label and original headers)
                writer.writerow(auxiliary_row)
                # Write header row (second line)
                writer.writerow(header)
                # Write data rows
                writer.writerows(data_rows)

            print(f"    [OK] Converted table to {csv_file.name} ({len(rows)} rows)")

            # Check if there's content before or after the table
            has_content_before = start_line > 0
            has_content_after = end_line < len(md_lines)

            if has_content_before or has_content_after:
                # Create template file in temp folder
                template_file = temp_dir / f"{md_file.stem}_template.md"
                template_content = create_template(md_lines, start_line, end_line)

                with open(template_file, 'w', encoding='utf-8') as f:
                    f.write(template_content)

                print(f"    [OK] Created template: {template_file.name}")
            else:
                print("    [INFO] File contains only table, no template needed")

        except Exception as e:
            print(f"    [ERROR] Error converting {md_file.name}: {e}")
            import traceback
            traceback.print_exc()

    print("\nConversion complete!")


if __name__ == "__main__":
    convert_all_md_files()
