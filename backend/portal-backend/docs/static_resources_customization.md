# Static Resource Customization

APIHUB Backend ships a set of static template files that drive AI-assistant features.
These files are **intentionally bundled inside the image** — no runtime configuration
is needed — but they are also the primary customisation point for downstream deployments
that want to change prompts or document templates without touching the Go source code.

## Directory layout

All customisable static resources live under the working directory of the service:

```text
static/
└── templates/
    └── resources/
        ├── styles.css               # CSS for HTML export / rendered views
        ├── corporatelogo.png        # Logo used in exported documents
        ├── ExcelExportTemplate.xlsx # Excel template for data exports
        └── mcp/
            ├── prompts/             # LLM prompt templates loaded at startup
            │   └── ids_generation_prompt.md
            └── resources/           # Document templates registered as MCP resources
                └── ids_template.md
```

In the production image (`WORKDIR=/app/qubership-apihub-service`) the paths resolve to:

```text
/app/qubership-apihub-service/static/templates/resources/mcp/
```

The service reads every file in `mcp/prompts/` and `mcp/resources/` once at startup and
holds them in memory for the lifetime of the process. To deploy updated templates you
**rebuild and redeploy the image** — no rolling config reload is required or supported.

---

## File reference

### `styles.css`

**Purpose:** CSS style sheet used when rendering API documentation pages and HTML exports.

**What to customise:** Branding colours, fonts, spacing, and any UI chrome specific to
your organisation's design system.

---

### `corporatelogo.png`

**Purpose:** Logo image embedded in exported documents (HTML pages, PDF covers, etc.).

**What to customise:** Replace with your company or project logo. Recommended format: PNG
with transparent background, minimum 200 × 60 px.

---

### `ExcelExportTemplate.xlsx`

**Purpose:** Excel workbook template used as the base when exporting API operation data
to spreadsheets. Column headers, formatting, and sheet layout come from this file.

**What to customise:** Column structure, header styling, corporate colour scheme, or
additional sheets required by internal reporting standards.

---

### `mcp/prompts/ids_generation_prompt.md`

**Purpose:** Step-by-step generation rules delivered to the LLM when a user requests an
IDS (Integration Design Specification) document.

**How it is used:**

1. The AI chat assistant detects an IDS generation request and invokes the
   `start_ids_generation` chat tool.
2. `MCPService.IDSAuthoringKit()` loads this file along with `ids_template.md` and
   assembles a single authoritative instruction block that is injected into the LLM context
   for the remainder of the turn.
3. The LLM follows the rules in this file to call `search_rest_api_operations` and
   `get_rest_api_operations_specification` MCP tools, populate the template, and finally
   invoke `save_generated_file` with the completed Markdown document.

**What to customise:**

- The workflow steps (numbering, ordering of sections).
- APIHub search strategies — e.g., default API release version, abbreviation conventions.
- Tone, verbosity, and language of generated content.
- Additional validation checks or mandatory sections.

**Constraints:**

- The file must remain valid UTF-8 text (Markdown recommended).
- The instructions must tell the LLM to call `save_generated_file` at the end, otherwise
  the download link will not appear in the chat.
- Removing or renaming this file disables the IDS generation feature entirely (the
  `start_ids_generation` tool will not be registered).

---

### `mcp/resources/ids_template.md`

**Purpose:** The canonical Markdown skeleton for an IDS document. This is the template
the LLM fills in when generating a new specification.

**How it is used:**

1. Loaded by `MCPService.IDSAuthoringKit()` alongside the generation prompt.
2. Embedded verbatim (inside a fenced code block) in the instruction block so the LLM
   sees the exact section structure it must preserve.
3. Also registered as a named MCP resource (`ids_template`) so that external MCP clients
   can retrieve the raw template directly via the `resources/read` MCP endpoint.

**What to customise:**

- Section headings, placeholder names (`<generate_document_id>`, `<current_date>`, etc.).
- Company- or project-specific metadata fields (owner, Jira templates, document ID format).
- Mandatory / optional sections — add or remove sections to match internal standards.
- Language of the section headings and placeholder labels.

**Constraints:**

- The file must remain valid UTF-8 text (Markdown).
- Removing or renaming this file disables the IDS generation feature (same as the prompt).

---

## How to customise in a downstream image

Add a `COPY` instruction in your downstream `Dockerfile` **after** the base image layer:

```dockerfile
FROM your-registry/qubership-apihub-backend:<version>

# Replace the IDS template with a company-specific version
COPY my-ids-template.md \
     /app/qubership-apihub-service/static/templates/resources/mcp/resources/ids_template.md

# Optionally replace the generation prompt
COPY my-ids-prompt.md \
     /app/qubership-apihub-service/static/templates/resources/mcp/prompts/ids_generation_prompt.md
```

You can also add entirely new prompt or resource files: any `.md`, `.json`, or `.yaml`
file placed in `mcp/prompts/` or `mcp/resources/` is automatically picked up at startup
and registered with the MCP server.

---

## Adding new resource types

The loader (`service/MCPAssets.go`) is generic: it reads **all files** from the two
subdirectories and registers them by their logical name (filename without extension).

To add a new feature that uses a bundled template:

1. Place the file in `static/templates/resources/mcp/resources/<name>.<ext>` or
   `static/templates/resources/mcp/prompts/<name>.<ext>`.
2. Reference it in your service code by the logical name (e.g., `mcpAssets.Resource("name")`
   or `mcpAssets.Prompt("name")`).
3. The file is automatically registered as an MCP resource/prompt and can be fetched by
   MCP clients without any additional wiring.
