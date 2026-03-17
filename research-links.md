# Book Purchase/Borrow URL Patterns

## Purchase Links (by ISBN or title+author search)

### Amazon
- By ISBN: `https://www.amazon.com/dp/{ISBN13}` or `https://www.amazon.com/s?k={ISBN}`
- By title: `https://www.amazon.com/s?k={title}+{author}&i=stripbooks`

### Barnes & Noble
- By ISBN: `https://www.barnesandnoble.com/w/?ean={ISBN13}`
- By title: `https://www.barnesandnoble.com/s/{title}+{author}`

### Bookshop.org (supports indie bookstores)
- By ISBN: `https://bookshop.org/p/books/{ISBN13}` — not reliable
- By search: `https://bookshop.org/search?keywords={title}+{author}`

### Google Books
- By ISBN: `https://books.google.com/books?vid=ISBN{ISBN}`
- By title: `https://books.google.com/books?q={title}+{author}`

### Open Library (free digital lending)
- By ISBN: `https://openlibrary.org/isbn/{ISBN}`
- By search: `https://openlibrary.org/search?q={title}+{author}`

## Library / Borrow Links

### WorldCat (find in libraries near you)
- By ISBN: `https://www.worldcat.org/isbn/{ISBN}`
- By title search: `https://www.worldcat.org/search?q={title}`
- WorldCat automatically shows nearby libraries based on user location

### Library-specific deep links
- Many library systems support OpenURL or ISBN search
- Common pattern: `https://{library-catalog-url}/search?isbn={ISBN}`
- For simplicity, we'll use WorldCat which covers most library systems globally

## Strategy
- Generate links using ISBN when available, fall back to title+author search URLs
- WorldCat for library availability (no API key needed, just URL construction)
- All links open in new tabs
- No API calls needed — just URL construction from book metadata we already have
