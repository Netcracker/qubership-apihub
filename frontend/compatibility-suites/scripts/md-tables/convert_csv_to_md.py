#!/usr/bin/env python3

import csv
import io
import json
from pathlib import Path

# Placeholder that was used in templates
TABLE_PLACEHOLDER = "{{TABLE_PLACEHOLDER}}"
CONFIG_FILE = "config.json"
TEMP_FOLDER = "__script_temp"


def csv_to_markdown_table(csv_file_path, table_format='max_width'):
    """
    Convert a CSV file to a Markdown table format.

    The CSV file should have:
    - First row: auxiliary row with original headers (comma-separated in a single cell)
    - Second row: current header row
    - Remaining rows: data rows

    Only columns present in the first row (original headers) will be included in the table.

    Args:
        csv_file_path: Path to the CSV file
        table_format: 'max_width' for tables with column widths matching content,
                     'compact' for minimal-width tables

    Returns:
        str: Markdown table as a string
    """
    markdown_lines = []

    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        # Use csv.reader to properly handle quoted fields and commas within fields
        reader = csv.reader(csvfile)

        rows = list(reader)
        if not rows or len(rows) < 2:
            return ""

        # First row contains two cells:
        # - First cell: Label "Column names to be included in the MD Table (comma-separated)"
        # - Second cell: Original headers (comma-separated)
        if len(rows[0]) >= 2:
            # Second cell contains the original headers
            original_headers_str = rows[0][1]
            # Split by comma, preserving empty strings (for empty columns)
            # Use csv.reader on the string to handle proper CSV parsing
            header_reader = csv.reader(io.StringIO(original_headers_str))
            original_headers = list(next(header_reader))
            original_headers = [h.strip() for h in original_headers]
        elif len(rows[0]) == 1:
            # Fallback: single cell with comma-separated headers (old format)
            original_headers_str = rows[0][0]
            header_reader = csv.reader(io.StringIO(original_headers_str))
            original_headers = list(next(header_reader))
            original_headers = [h.strip() for h in original_headers]
        else:
            # No headers found
            original_headers = []

        # Second row is the current header
        current_header = rows[1]

        # Determine which columns to use based on original headers
        # Map original header names to their positions in the current header
        column_indices = []
        used_indices = set()  # Track used indices to handle duplicate headers

        for orig_header in original_headers:
            # Find the index in current_header, avoiding duplicates
            found = False
            for idx, curr_header in enumerate(current_header):
                if curr_header.strip() == orig_header and idx not in used_indices:
                    column_indices.append(idx)
                    used_indices.add(idx)
                    found = True
                    break
            if not found:
                # Original header not found in current header, skip it
                pass

        # If no original headers found or mapping failed, use all columns from current header
        if not column_indices:
            column_indices = list(range(len(current_header)))
            original_headers = current_header

        # Extract only the columns that match original headers
        header_to_use = [current_header[i] if i < len(current_header) else "" for i in column_indices]

        # Collect all data rows
        data_rows = []
        for row in rows[2:]:  # Skip auxiliary row and header row
            row_data = [row[i] if i < len(row) else "" for i in column_indices]
            data_rows.append(row_data)

        if table_format == 'max_width':
            # Calculate the maximum width for each column
            # Include header and all data rows
            num_columns = len(header_to_use)
            column_widths = [0] * num_columns

            # Check header widths
            for i, header in enumerate(header_to_use):
                column_widths[i] = max(column_widths[i], len(str(header)))

            # Check data row widths
            for row_data in data_rows:
                for i, cell in enumerate(row_data):
                    if i < num_columns:
                        column_widths[i] = max(column_widths[i], len(str(cell)))

            # Format header row with proper padding
            header_cells = []
            for i, header in enumerate(header_to_use):
                width = column_widths[i]
                header_cells.append(str(header).ljust(width))
            markdown_lines.append("| " + " | ".join(header_cells) + " |")

            # Create separator row with dashes matching column widths + 2 extra dashes
            separator_cells = []
            for width in column_widths:
                separator_cells.append("-" * (width + 2))
            markdown_lines.append("| " + " | ".join(separator_cells) + " |")

            # Create data rows with proper padding
            for row_data in data_rows:
                data_cells = []
                for i, cell in enumerate(row_data):
                    if i < num_columns:
                        width = column_widths[i]
                        data_cells.append(str(cell).ljust(width))
                    else:
                        data_cells.append("")
                markdown_lines.append("| " + " | ".join(data_cells) + " |")
        else:
            # Compact format: minimal width
            # Create header row
            markdown_lines.append("| " + " | ".join(header_to_use) + " |")

            # Create separator row (compact)
            markdown_lines.append("| " + " | ".join(["----" for _ in header_to_use]) + " |")

            # Create data rows
            for row_data in data_rows:
                markdown_lines.append("| " + " | ".join(row_data) + " |")

    return "\n".join(markdown_lines)


def load_config(script_dir):
    """
    Load configuration from config.json file.

    Returns:
        tuple: (files_to_process, table_format)
            - files_to_process: List of file names (without extension) to process, or ['all'] for all files
            - table_format: 'max_width' or 'compact' (default: 'max_width')
    """
    config_path = script_dir / CONFIG_FILE
    if not config_path.exists():
        print(f"[WARNING] Config file {CONFIG_FILE} not found. Processing all files with default format.")
        return (['all'], 'max_width')

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        files_to_process = config.get('files_to_process', ['all'])
        table_format = config.get('table_format', 'max_width')
        # Validate table_format
        if table_format not in ['max_width', 'compact']:
            print(f"[WARNING] Invalid table_format '{table_format}'. Using 'max_width'.")
            table_format = 'max_width'
        return (files_to_process, table_format)
    except Exception as e:
        print(f"[WARNING] Error reading config file: {e}. Processing all files with default format.")
        return (['all'], 'max_width')


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


def convert_all_csv_files():
    """
    Find all CSV files in the current directory and convert them to Markdown.
    Files are filtered based on config.json configuration.
    """
    # Get the directory where this script is located
    script_dir = Path(__file__).parent

    # Load configuration
    files_to_process, table_format = load_config(script_dir)

    # Use temp folder for CSV and template files (create if not exists)
    temp_dir = script_dir / TEMP_FOLDER
    temp_dir.mkdir(exist_ok=True)

    docs_root, md_by_stem = find_docs_md_files(script_dir)

    # Find all CSV files in the temp folder
    csv_files = list(temp_dir.glob("*.csv"))

    # Filter files based on configuration
    csv_files = [f for f in csv_files if should_process_file(f, files_to_process)]

    if not csv_files:
        print(f"No CSV files found to process in {temp_dir}")
        return

    print(f"Found {len(csv_files)} CSV file(s) to convert:")

    for csv_file in csv_files:
        print(f"  - {csv_file.name}")

        # The generated .md file replaces the file with the same name under the docs directory
        md_file = md_by_stem.get(csv_file.stem, docs_root / f"{csv_file.stem}.md")

        # Check if template exists in temp folder
        template_file = temp_dir / f"{csv_file.stem}_template.md"
        template_exists = template_file.exists()

        try:
            # Convert CSV to Markdown table
            markdown_table = csv_to_markdown_table(csv_file, table_format)

            if not markdown_table:
                print(f"    [WARNING] No data found in {csv_file.name}")
                continue

            if template_exists:
                # Read template and replace placeholder with table
                with open(template_file, 'r', encoding='utf-8') as f:
                    template_content = f.read()

                # Replace placeholder with the table
                if TABLE_PLACEHOLDER in template_content:
                    final_content = template_content.replace(TABLE_PLACEHOLDER, markdown_table)
                    print(f"    [INFO] Using template: {template_file.name}")
                else:
                    # Placeholder not found, append table at the end
                    final_content = template_content.rstrip() + "\n\n" + markdown_table
                    print("    [WARNING] Placeholder not found in template, appending table")
            else:
                # No template, just use the table and add a blank line after it
                final_content = markdown_table + "\n"

            # Write to .md file (newline='\n' so we always use LF, avoiding CRLF diff noise on Windows)
            with open(md_file, 'w', encoding='utf-8', newline='\n') as f:
                f.write(final_content)

            print(f"    [OK] Converted to {md_file.name}")

        except Exception as e:
            print(f"    [ERROR] Error converting {csv_file.name}: {e}")
            import traceback
            traceback.print_exc()

    print("\nConversion complete!")


if __name__ == "__main__":
    convert_all_csv_files()
