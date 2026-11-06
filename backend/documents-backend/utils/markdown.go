package utils

import "strings"

// MarkdownTitleAndSubtitle returns the first '#' heading and the first paragraph after it (single line, trimmed).
func MarkdownTitleAndSubtitle(markdown string) (title string, subtitle string) {
	lines := strings.Split(strings.ReplaceAll(markdown, "\r\n", "\n"), "\n")
	i := 0
	for ; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if strings.HasPrefix(line, "#") {
			title = strings.TrimSpace(strings.TrimLeft(line, "#"))
			i++
			break
		}
	}
	if title == "" {
		return "", ""
	}
	var paragraph []string
	for ; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			if len(paragraph) > 0 {
				break
			}
			continue
		}
		if strings.HasPrefix(line, "#") || strings.HasPrefix(line, "```") || strings.HasPrefix(line, "!") {
			break
		}
		paragraph = append(paragraph, line)
	}
	return title, strings.Join(paragraph, " ")
}
