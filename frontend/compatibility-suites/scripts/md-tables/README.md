# CSV/Markdown Conversion Scripts

This folder contains Python scripts for converting between Markdown table format and CSV format, with support for
preserving document structure and filtering columns.

## Overview

The conversion scripts provide bidirectional conversion between Markdown tables and CSV files, with the following
features:

- **Template Support**: Preserves content before and after tables in Markdown files
- **Column Filtering**: Maintains original column structure even when CSV files are modified
- **Configuration-Based Processing**: Select which files to process via configuration file
- **Empty Column Preservation**: Correctly handles empty columns in tables
- **Temp Folder**: CSV and template files are read from / written to `__script_temp/` so they are easy to delete and are
  ignored by Git
- **Line Endings**: Generated `.md` files use LF only, and `.gitattributes` enforces LF in the repo to avoid noisy diffs
  on Windows

## Scripts

### `convert_md_to_csv.py`

Converts Markdown table files to CSV format.

**Features:**

- Extracts tables from Markdown files (reads `.md` files under `docs_dir`, which `config.json` sets to
  `docs/reference/api-changes/`)
- Creates CSV files with auxiliary metadata row in **`__script_temp/`**
- Generates template files (`*_template.md`) in **`__script_temp/`** for files with content beyond just tables
- Creates `__script_temp/` if it does not exist
- Filters files based on configuration

**Output Location:** All CSV and template files are written to **`__script_temp/`** (not next to the Markdown files).

**Output Format:**

- First row: Auxiliary row with label and original column names
- Second row: Current header row
- Remaining rows: Data rows

### `convert_csv_to_md.py`

Converts CSV files back to Markdown table format.

**Features:**

- Reads CSV and template files from **`__script_temp/`** (creates the folder if it does not exist)
- Writes generated `.md` files back to the files under `docs_dir` (`docs/reference/api-changes/`)
- Converts CSV to Markdown tables
- Uses template files from `__script_temp/` when available
- When no template exists, adds a blank line after the table
- Writes `.md` files with **LF line endings only** to avoid CRLF vs LF diff noise on Windows
- Filters columns based on original structure (ignores added columns)
- Preserves empty columns

**Input Location:** CSV and `*_template.md` files must be in **`__script_temp/`**.

**Input Format:**

- First row: Auxiliary row with label and original column names
- Second row: Current header row
- Remaining rows: Data rows

### `config.json`

Configuration file that controls which files are processed by the scripts. `docs_dir` points at the folder with the
Markdown tables (`docs/reference/api-changes/`, relative to the config file); the scripts search it recursively, except
`README.md`.

### `__script_temp/` folder

- **Purpose:** Holds all generated CSV and template (`*_template.md`) files so they are in one place and easy to delete.
- **Created automatically** by both scripts if it does not exist.
- **Ignored by Git** via `.gitignore` (so temp files are not committed).
- **Workflow:** Run `convert_md_to_csv.py` to fill `__script_temp/`; edit CSVs there; run `convert_csv_to_md.py` to read
  from `__script_temp/` and write `.md` files to `docs/reference/api-changes/`.

## Installation

No additional dependencies are required beyond Python 3 standard library:

- `csv`
- `json`
- `re`
- `pathlib`
- `io`

## Configuration

### Setting Up `config.json`

The configuration file allows you to control which files are processed:

**Option 1: Process All Files:**

```json
{
  "files_to_process": ["all"]
}
```

**Option 2: Process Specific Files:**

```json
{
  "files_to_process": [
    "schema-changes",
    "general-operation-parameters",
    "Operation-Parameters"
  ]
}
```

**Table Format Options:**

```json
{
  "table_format": "max_width"
}
```

or

```json
{
  "table_format": "compact"
}
```

**Important Notes:**

- File names should be specified **without** the `.md` or `.csv` extension
- File names are **case-sensitive** and must match exactly
- Template files (ending with `_template.md`) are automatically excluded
- **`table_format`**: Controls how Markdown tables are formatted when converting CSV to MD
  - **`max_width`** (default): Tables with column widths matching content width (original format)
  - **`compact`**: Minimal-width tables with compact formatting

## Usage in Cursor

### Method 1: Right-Click Execution

1. **Open the script file** in Cursor (`convert_md_to_csv.py` or `convert_csv_to_md.py`)
2. **Right-click** on the file in the file explorer
3. Select **"Run Python File in Terminal"** (or similar option depending on your Cursor version)
4. The script will execute and display progress in the terminal

### Method 2: Terminal Command

1. **Open the integrated terminal** in Cursor (`` Ctrl+` `` or `View > Terminal`)
2. **Navigate to the project root** (where the scripts are located)
3. **Run the script:**

   ```bash
   python convert_md_to_csv.py
   ```

   or

   ```bash
   python convert_csv_to_md.py
   ```

### Method 3: Command Palette

1. Press **`Ctrl+Shift+P`** (or `Cmd+Shift+P` on Mac) to open Command Palette
2. Type **"Python: Run Python File in Terminal"**
3. Select the script file when prompted

## Usage Examples

### Converting Markdown to CSV

```bash
python convert_md_to_csv.py
```

**What it does:**

- Finds all `.md` files in `docs_dir` (filtered by config)
- Extracts tables from each file
- Creates corresponding `.csv` files in **`__script_temp/`**
- Creates `_template.md` files in **`__script_temp/`** for files with content beyond tables

**Example Output:**

```text
Found 5 Markdown file(s) to convert:
  - schema-changes.md
    [OK] Converted table to schema-changes.csv (166 rows)
    [OK] Created template: schema-changes_template.md
  - general-operation-parameters.md
    [OK] Converted table to general-operation-parameters.csv (60 rows)
    [INFO] File contains only table, no template needed
```

*(CSV and template files are written to `__script_temp/`.)*

### Converting CSV to Markdown

```bash
python convert_csv_to_md.py
```

**What it does:**

- Finds all `.csv` files in **`__script_temp/`** (filtered by config)
- Converts CSV tables to Markdown format
- Uses template files from `__script_temp/` when available
- Writes `.md` files to `docs_dir` (`docs/reference/api-changes/`) with LF line endings
- When no template exists, adds a blank line after the table
- Only includes columns specified in the original structure
- Formats tables according to `table_format` setting in config (default: `max_width`)

**Table Format Options:**

- **`max_width`**: Column widths match content width (preserves original formatting)
- **`compact`**: Minimal-width tables for more compact output

**Example Output:**

```text
Found 5 CSV file(s) to convert:
  - schema-changes.csv
    [INFO] Using template: schema-changes_template.md
    [OK] Converted to schema-changes.md
  - general-operation-parameters.csv
    [OK] Converted to general-operation-parameters.md
```

## CSV File Structure

The CSV files generated by these scripts have a special structure:

### First Row (Auxiliary Row)

- **First cell:** `"Column names to be included in the MD Table (comma-separated)"`
- **Second cell:** Original column names from the Markdown table (comma-separated)

This auxiliary row serves as a snapshot of the original column structure, allowing the script to filter out any columns
that were added during CSV editing.

### Second Row

- Contains the current header row (column names)

### Remaining Rows

- Data rows from the table

## Template Files

When a Markdown file contains content before or after the table, a template file is automatically created in
**`__script_temp/`**:

- **Filename:** `{original_filename}_template.md`
- **Location:** `__script_temp/`
- **Content:** Original file content with the table replaced by `{{TABLE_PLACEHOLDER}}`

When converting CSV back to Markdown, the script looks for template files in **`__script_temp/`**. If a template exists,
it will be used and the table will be inserted at the placeholder location. If no template exists, the table is written
with a blank line after it.

## Workflow Example

1. **Initial Conversion (MD → CSV):**

   ```bash
   python convert_md_to_csv.py
   ```

   - Creates **`__script_temp/`** if it does not exist
   - Writes `schema-changes.csv` and `schema-changes_template.md` into **`__script_temp/`**
   - Markdown source files (e.g. `schema-changes.md`) stay in `docs/reference/api-changes/`

2. **Edit CSV File:**
   - Open **`__script_temp/schema-changes.csv`** in Excel or any CSV editor
   - Add new columns for your work (e.g., "Notes", "Status")
   - Modify data as needed

3. **Convert Back (CSV → MD):**

   ```bash
   python convert_csv_to_md.py
   ```

   - Reads CSV and template from **`__script_temp/`**
   - Reads the auxiliary row to identify original columns
   - Filters out the added columns ("Notes", "Status")
   - Uses the template to restore the original document structure
   - Writes `schema-changes.md` to `docs/reference/api-changes/` (LF line endings)

4. **Clean up (optional):** Delete **`__script_temp/`** when you no longer need the CSV/template files. The folder is in
   `.gitignore`, so it is not committed.

## Troubleshooting

### Script Not Found

- Run the scripts from `frontend/compatibility-suites/scripts/md-tables/`, where `config.json` and the scripts live

### Config File Not Found

- If `config.json` is missing, the script will process all files by default
- Create the config file using the examples above

### No Tables Found

- The script will skip files that don't contain Markdown tables
- Check that your Markdown files have properly formatted tables (using `|` separators)

### Column Mismatch

- Ensure the CSV file maintains the auxiliary row structure
- The first row should have two cells: label and original column names
- The second row should contain the current headers

### CSV/Template Files Not Found (convert_csv_to_md)

- The script looks for CSV and template files in **`__script_temp/`** only
- Run `convert_md_to_csv.py` first to generate files in `__script_temp/`, or copy your CSV and `*_template.md` files
  there

### File Marked as Changed by Git but No Visible Difference

- This is usually **line endings** (CRLF vs LF). The scripts write `.md` with LF only, and `.gitattributes` enforces LF
  in the repo
- To fix an already-modified file: re-run `convert_csv_to_md.py` to regenerate the `.md` with LF, or in Cursor use
  **Change End of Line Sequence** (status bar) and choose **LF**, then save

## Table Formatting

The script supports two table formatting modes controlled by the `table_format` setting in `config.json`:

### Max Width Format (default)

- Column widths are calculated based on the widest content in each column
- Preserves the original formatting style with proper spacing
- Better readability for tables with varying content lengths
- Example: `| Column 1                               | Column 2 |`

### Compact Format

- Minimal column widths
- More space-efficient
- Better for tables with consistent content lengths
- Example: `| Column 1 | Column 2 |`

## Files

- `convert_md_to_csv.py` - MD to CSV converter
- `convert_csv_to_md.py` - CSV to MD converter
- `config.json` - Configuration file, including `docs_dir`
- `README.md` - This documentation file
- `.gitignore` - Keeps `__script_temp/` out of Git
