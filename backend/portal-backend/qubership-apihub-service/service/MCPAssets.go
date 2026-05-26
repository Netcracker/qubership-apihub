package service

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"

	log "github.com/sirupsen/logrus"
)

// mcpAssetsRootDir is the on-disk root that the image bundles MCP-side static assets under.
// Layout:
//
//	<root>/prompts/<name>.md   - text content registered as MCP prompts (and reused by chat tools)
//	<root>/resources/<name>.md - text content registered as MCP resources
//
// The path is intentionally hard-coded relative to the service's working directory: image
// rebuilds drop in new files, no config knob required. Local dev (running from the service
// folder) and the production image (WORKDIR=/app/qubership-apihub-service) both resolve to
// the same place because the Dockerfile copies the static tree verbatim.
//
// Downstream images that need to customise templates can COPY their own files over this path;
// see docs/static_resources_customization.md for the full customisation contract.
const mcpAssetsRootDir = "./static/templates/resources/mcp"

const (
	mcpAssetsPromptsSubdir   = "prompts"
	mcpAssetsResourcesSubdir = "resources"
)

// Asset names used by the IDS generation feature. They are referenced by
// ChatService tools and by the MCP prompt/resource registrations -- using
// constants keeps the wiring honest if the underlying files are renamed.
const (
	idsAssetPromptName   = "ids_generation_prompt"
	idsAssetResourceName = "ids_template"
)

// mcpAssets is the in-memory snapshot of all MCP-side bundled assets, taken once at
// startup. Files are read into RAM eagerly because:
//   - they are tiny (a handful of KB each);
//   - the contents must NOT change while the service is running (the image is the
//     single source of truth -- "swap a template by rebuilding the image" is the
//     contract we promised the operators);
//   - subsequent reads from MCP / chat tool handlers must be lock-free fast.
//
// All maps are keyed by the asset's logical name (file name without extension).
type mcpAssets struct {
	mu        sync.RWMutex
	prompts   map[string]mcpAsset
	resources map[string]mcpAsset
}

// mcpAsset is a single bundled file together with the metadata needed to expose it
// over MCP (resource MIME type, etc.).
type mcpAsset struct {
	// Name is the logical asset name (file name without extension).
	Name string
	// Filename is the original file name including extension.
	Filename string
	// MIMEType is derived from the file extension: .md -> text/markdown, otherwise text/plain.
	MIMEType string
	// Content is the raw file body.
	Content string
}

// loadMCPAssets reads every regular file under <rootDir>/prompts and <rootDir>/resources
// once. Missing directories are tolerated (just produce empty maps + a warning) so a
// minimally-configured deployment can still start; the dependent features simply won't
// register.
func loadMCPAssets(rootDir string) *mcpAssets {
	a := &mcpAssets{
		prompts:   map[string]mcpAsset{},
		resources: map[string]mcpAsset{},
	}
	a.prompts = readAssetsDir(filepath.Join(rootDir, mcpAssetsPromptsSubdir))
	a.resources = readAssetsDir(filepath.Join(rootDir, mcpAssetsResourcesSubdir))
	log.Infof("MCP assets loaded: %d prompts, %d resources (root=%s)",
		len(a.prompts), len(a.resources), rootDir)
	return a
}

func readAssetsDir(dir string) map[string]mcpAsset {
	out := map[string]mcpAsset{}
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			log.Warnf("MCP assets directory not found, skipping: %s", dir)
			return out
		}
		log.Warnf("Failed to read MCP assets directory %s: %v", dir, err)
		return out
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		path := filepath.Join(dir, e.Name())
		body, err := os.ReadFile(path)
		if err != nil {
			log.Warnf("Failed to read MCP asset %s: %v", path, err)
			continue
		}
		name := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		out[name] = mcpAsset{
			Name:     name,
			Filename: e.Name(),
			MIMEType: mimeTypeForFilename(e.Name()),
			Content:  string(body),
		}
	}
	return out
}

func mimeTypeForFilename(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".md":
		return "text/markdown"
	case ".json":
		return "application/json"
	case ".yaml", ".yml":
		return "application/yaml"
	default:
		return "text/plain"
	}
}

// Prompt returns the prompt asset by logical name (file name without extension).
func (a *mcpAssets) Prompt(name string) (mcpAsset, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	v, ok := a.prompts[name]
	return v, ok
}

// Resource returns the resource asset by logical name.
func (a *mcpAssets) Resource(name string) (mcpAsset, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	v, ok := a.resources[name]
	return v, ok
}

// ListResources returns a snapshot of all loaded resource assets.
func (a *mcpAssets) ListResources() []mcpAsset {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]mcpAsset, 0, len(a.resources))
	for _, v := range a.resources {
		out = append(out, v)
	}
	return out
}

// ListPrompts returns a snapshot of all loaded prompt assets.
func (a *mcpAssets) ListPrompts() []mcpAsset {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]mcpAsset, 0, len(a.prompts))
	for _, v := range a.prompts {
		out = append(out, v)
	}
	return out
}

// IDSAssetsAvailable reports whether the bundled IDS template + prompt are both present.
// Used by the chat layer to decide if the IDS-related tools should be advertised to the LLM.
func (a *mcpAssets) IDSAssetsAvailable() bool {
	_, hasPrompt := a.Prompt(idsAssetPromptName)
	_, hasTpl := a.Resource(idsAssetResourceName)
	return hasPrompt && hasTpl
}

// IDSAuthoringKit assembles the self-contained instruction blob the LLM consumes
// after invoking the start_ids_generation chat tool. The blob bundles:
//   - the user's natural-language request (verbatim);
//   - the IDS markdown template (loaded from static/templates/resources/mcp/resources/ids_template.md);
//   - the step-by-step generation rules (loaded from static/templates/resources/mcp/prompts/ids_generation_prompt.md);
//   - a hand-off footer telling the model exactly which tool to call when done.
//
// Returning the kit as a single string is deliberate: this lets the LLM treat it as
// the authoritative spec for the rest of the turn and lets us evolve the layout
// without bumping any wire schema.
func (a *mcpAssets) IDSAuthoringKit(userInput string) (string, error) {
	tpl, ok := a.Resource(idsAssetResourceName)
	if !ok {
		return "", fmt.Errorf("ids template asset %q is not bundled in the image", idsAssetResourceName)
	}
	prompt, ok := a.Prompt(idsAssetPromptName)
	if !ok {
		return "", fmt.Errorf("ids generation prompt asset %q is not bundled in the image", idsAssetPromptName)
	}
	var b strings.Builder
	b.WriteString("You are now generating an Integration Design Specification (IDS) document for the user.\n")
	b.WriteString("Follow the rules below precisely. Use the apihub MCP tools (search_api_operations, get_api_operation_specification, get_document) to look up real API specs whenever the rules tell you to. When the document is complete, call the save_generated_file tool with the full markdown content; the tool returns a Markdown link of the form `[<filename>](<url>)` which you MUST embed verbatim in your final reply so the user can download the file.\n\n")
	b.WriteString("## USER REQUEST (verbatim)\n\n")
	b.WriteString(strings.TrimSpace(userInput))
	b.WriteString("\n\n## TEMPLATE TO FILL (markdown)\n\nThis is the canonical IDS template. Keep its section structure and headings; populate placeholders according to the rules in the next section.\n\n")
	b.WriteString("```markdown\n")
	b.WriteString(tpl.Content)
	if !strings.HasSuffix(tpl.Content, "\n") {
		b.WriteString("\n")
	}
	b.WriteString("```\n\n## GENERATION RULES (step by step)\n\n")
	b.WriteString(prompt.Content)
	if !strings.HasSuffix(prompt.Content, "\n") {
		b.WriteString("\n")
	}
	b.WriteString("\n## OUTPUT CONTRACT\n\n")
	b.WriteString("- Produce the full IDS document as markdown, end-to-end, with all sections from the template populated according to the rules.\n")
	b.WriteString("- DO NOT include the rules or this scaffolding in the document body; only the template-shaped content.\n")
	b.WriteString("- Pick a concise file name like `IDS_<3rdPartySystemAbbrev>.md` (no spaces, ASCII).\n")
	b.WriteString("- Call `save_generated_file` with that filename and the full markdown content. After the tool returns the download link, write a short user-facing reply that includes the link and a one-paragraph summary of what was generated.\n")
	return b.String(), nil
}
