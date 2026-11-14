package repository

import "fmt"

// systemUser is the author recorded for rows the service writes on its own behalf, not on a caller's.
const systemUser = "system"

// searchTextConfig is the PostgreSQL text-search configuration used for every search_vector of this
// service. 'simple' does no stemming and no stop-word removal, which is what identifiers, qualified class
// names, and Maven coordinates need: an English stemmer would fold 'Mapping' and 'maps' into one token and
// drop short words that are legitimate package-name fragments.
const searchTextConfig = "simple"

// searchNormalizeTemplate is the SQL expression that reduces text to plain word tokens. Both the indexed
// text and the query text must pass through it: the default parser keeps 'jackson-databind' and
// 'com.example.Foo' as single compound tokens, so without it a search for one segment never matches the
// whole name.
const searchNormalizeTemplate = `regexp_replace(%s, '[^a-zA-Z0-9_]+', ' ', 'g')`

// searchNormalize renders searchNormalizeTemplate around a column name or a bind placeholder. The argument
// is always a literal from this package, never caller input.
func searchNormalize(expr string) string {
	return fmt.Sprintf(searchNormalizeTemplate, expr)
}

// searchVectorExpr builds the tsvector expression for a normalised source expression.
func searchVectorExpr(expr string) string {
	return fmt.Sprintf("to_tsvector(?, %s)", searchNormalize(expr))
}

// searchQueryExpr is the tsquery expression matching searchVectorExpr. It binds the text-search
// configuration and the caller's filter, in that order.
var searchQueryExpr = fmt.Sprintf("plainto_tsquery(?, %s)", searchNormalize("?"))
