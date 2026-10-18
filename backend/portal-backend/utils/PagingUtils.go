package utils

func PaginateList(listSize int, limit int, page int) (int, int) {
	// page count starts with 0
	if limit < 0 || page < 0 {
		return 0, 0
	}
	if limit == 0 {
		return 0, listSize
	}
	startIndex := (page) * limit
	endIndex := startIndex + limit

	if startIndex >= listSize {
		return 0, 0 // Return invalid indices if start index is out of range
	}

	if endIndex > listSize {
		endIndex = listSize // Adjust end index to the last index if it exceeds the list size
	}

	return startIndex, endIndex
}
