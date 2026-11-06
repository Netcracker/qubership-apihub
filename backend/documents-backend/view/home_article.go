package view

// HomeArticles is the public home page list: configured articles visible to the caller, in configured order.
type HomeArticles struct {
	Articles []Article `json:"articles"`
}

// AdminHomeArticles is the full configured list, including unpublished articles.
type AdminHomeArticles struct {
	Articles []AdminHomeArticle `json:"articles"`
}

type AdminHomeArticle struct {
	ArticleId    string `json:"articleId"`
	Slug         string `json:"slug"`
	Title        string `json:"title"`
	Published    bool   `json:"published"`
	DisplayOrder int    `json:"displayOrder"`
}

// HomeArticlesRequest replaces the whole list; array position is the order.
type HomeArticlesRequest struct {
	ArticleIds []string `json:"articleIds"`
}
