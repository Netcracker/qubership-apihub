package errorreport

import (
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"unicode/utf16"

	"github.com/xuri/excelize/v2"
)

const (
	summarySheet    = "Summary"
	detailsSheet    = "Builds"
	excelCellLimit  = 32767
	identifierWidth = 38
	textWidth       = 80
)

var detailHeaders = []string{"Build ID", "Package ID", "Version", "Revision", "Category", "Original error", "Cause", "Evidence", "Classification / notes"}

func detailRow(b Build) []string {
	label := b.Category
	if label == CategoryRestart {
		label += " -> " + b.InnerCategory
	}
	return []string{b.BuildID, b.PackageID, b.Version, string(b.Revision), label, b.Error, b.Cause, b.Evidence, b.Classification}
}

func (a Analysis) summaryRows() [][]string {
	counts, effective := make(map[string]int), make(map[string]int)
	for _, b := range a.Builds {
		counts[b.Category]++
		effective[b.EffectiveCategory]++
	}
	rows := [][]string{
		{"Migration ID", a.MigrationID},
		{"Total error builds analysed", strconv.Itoa(len(a.Builds))},
		{"Category", "Count", "Effective count (D unwrapped)", "Explanation"},
	}
	for _, c := range Categories {
		rows = append(rows, []string{c, strconv.Itoa(counts[c]), strconv.Itoa(effective[c]), Explanations[c]})
	}
	return rows
}

func Markdown(w io.Writer, a Analysis) error {
	if err := a.Validate(true); err != nil {
		return err
	}
	var out strings.Builder
	fmt.Fprintf(&out, "# Error build analysis\n\nMigration ID: %s\n\nTotal error builds analysed: %d\n\n", a.MigrationID, len(a.Builds))
	out.WriteString("## Category summary\n\n| Category | Count | Effective count (D unwrapped) | Explanation |\n| --- | --- | --- | --- |\n")
	for _, row := range a.summaryRows()[3:] { // The first three rows contain workbook metadata and column headings.
		writeMarkdownRow(&out, row)
	}
	out.WriteString("\n## Category E builds\n\n")
	found := false
	for _, b := range a.Builds {
		if b.EffectiveCategory == CategoryOther {
			fmt.Fprintf(&out, "- %s: %s\n", b.BuildID, markdownText(b.Classification))
			found = true
		}
	}
	if !found {
		out.WriteString("None.\n")
	}
	out.WriteString("\n## Build findings\n\n")
	writeMarkdownRow(&out, detailHeaders)
	separators := make([]string, len(detailHeaders))
	for i := range separators {
		separators[i] = "---"
	}
	writeMarkdownRow(&out, separators)
	for _, b := range a.Builds {
		writeMarkdownRow(&out, detailRow(b))
	}
	_, err := io.WriteString(w, out.String())
	return err
}

func markdownText(s string) string {
	return strings.NewReplacer("\\", "\\\\", "&", "&amp;", "<", "&lt;", ">", "&gt;", "|", "&#124;", "`", "&#96;", "\r\n", "<br>", "\n", "<br>", "\r", "<br>").Replace(s)
}

func writeMarkdownRow(out *strings.Builder, row []string) {
	values := make([]string, len(row))
	for i, value := range row {
		values[i] = markdownText(value)
	}
	out.WriteString("| " + strings.Join(values, " | ") + " |\n")
}

func Workbook(w io.Writer, a Analysis) (err error) {
	if err := a.Validate(true); err != nil {
		return err
	}
	f := excelize.NewFile()
	defer func() { err = errors.Join(err, f.Close()) }()
	if err := f.SetSheetName("Sheet1", summarySheet); err != nil {
		return err
	}
	if _, err := f.NewSheet(detailsSheet); err != nil {
		return err
	}
	style, err := f.NewStyle(&excelize.Style{Alignment: &excelize.Alignment{WrapText: true, Vertical: "top"}})
	if err != nil {
		return err
	}
	details := [][]string{detailHeaders}
	for _, b := range a.Builds {
		details = append(details, detailRow(b))
	}
	for _, sheet := range []struct {
		name string
		rows [][]string
	}{{summarySheet, a.summaryRows()}, {detailsSheet, details}} {
		for r, row := range sheet.rows {
			for c, value := range row {
				cell, err := excelize.CoordinatesToCellName(c+1, r+1)
				if err != nil {
					return err
				}
				if len(utf16.Encode([]rune(value))) > excelCellLimit {
					return fmt.Errorf("%s!%s exceeds Excel's cell text limit; export was stopped to avoid truncating evidence", sheet.name, cell)
				}
				if err := f.SetCellStr(sheet.name, cell, value); err != nil {
					return err
				}
				if err := f.SetCellStyle(sheet.name, cell, cell, style); err != nil {
					return err
				}
			}
		}
	}
	if err := f.SetColWidth(detailsSheet, "A", "E", identifierWidth); err != nil {
		return err
	}
	if err := f.SetColWidth(detailsSheet, "F", "I", textWidth); err != nil {
		return err
	}
	if err := f.SetColWidth(summarySheet, "A", "C", identifierWidth); err != nil {
		return err
	}
	if err := f.SetColWidth(summarySheet, "D", "D", textWidth); err != nil {
		return err
	}
	if err := f.SetPanes(detailsSheet, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
		return err
	}
	return f.Write(w)
}
