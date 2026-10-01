#!/usr/bin/env bash
#
# Builds A Hacker's Guide to Git (second edition) as a single Markdown file,
# then as EPUB and PDF, from the same MDX files that the blog publishes.
#
#   book/build.sh            # writes build/book.md, build/book.epub, build/book.pdf
#
# Needs pandoc and typst (brew install pandoc typst).

set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
BOOK="$ROOT/book"
POST="$ROOT/content/post/a-hackers-guide-to-git.mdx"
CHAPTERS="$ROOT/content/post/a-hackers-guide-to-git"
BUILD="$ROOT/build"
WEB="https://blog.structuredthoughts.dev/a-hackers-guide-to-git"
mkdir -p "$BUILD"

MD="$BUILD/book.md"
: > "$MD"

# Everything after the frontmatter, with the blog-only bits removed: the
# CarbonAd component, the "Next" and "Back" navigation links, and the
# chapter list (the EPUB and PDF get a generated table of contents instead).
# Interactive elements become their fallback image, or a pointer to the web
# version when they have none (the surrounding chapter already shows the same
# diagram in that case).
body() {
  awk 'BEGIN { fm = 0 } /^---$/ && fm < 2 { fm++; next } fm >= 2 { print }' "$1" \
    | grep -v '^<CarbonAd' \
    | grep -v '^\[Next: ' \
    | grep -v '^\[&larr; ' \
    | perl -pe 's{^<[A-Z]\w*\b(?=[^>]*\bfallback="([^"]+)")(?=[^>]*\balt="([^"]+)")[^>]*/>$}{![$2]($1)}; s{^<[A-Z]\w*\b[^>]*/>$}{*The web version of this chapter has an interactive version of this example at '"$WEB/$2"'.*}' \
    | sed -e 's#](/uploads/#](public/uploads/#g' \
          -e 's#](/a-hackers-guide-to-git/\([a-z0-9-]*\))#](\#\1)#g' \
          -e 's#](a-hackers-guide-to-git/\([a-z0-9-]*\))#](\#\1)#g'
}

title() {
  awk '/^title:/ { sub(/^title: */, ""); gsub(/^["'\'']|["'\'']$/, ""); print; exit }' "$1"
}

# Chapter order comes from the numbered list in the parent post.
slugs() {
  grep -o '](a-hackers-guide-to-git/[a-z0-9-]*)' "$POST" | sed 's#](a-hackers-guide-to-git/##; s#)##'
}

{
  echo "# Introduction {#introduction}"
  echo
  body "$POST" "" | grep -v '^0\. ' | sed '/^This guide is intended to be read in order/d'
  echo
  for slug in $(slugs); do
    f="$CHAPTERS/$slug.mdx"
    echo "# $(title "$f") {#$slug}"
    echo
    body "$f" "$slug"
    echo
  done
} >> "$MD"

cd "$ROOT"
pandoc "$BOOK/metadata.yaml" "$MD" \
  --from markdown+smart --to epub3 \
  --toc --toc-depth=2 \
  --css "$BOOK/epub.css" \
  --resource-path="$ROOT" \
  -o "$BUILD/book.epub"

pandoc "$BOOK/metadata.yaml" "$MD" \
  --from markdown+smart --to pdf --pdf-engine=typst \
  --toc --toc-depth=2 \
  --resource-path="$ROOT" \
  -V papersize=a5 -V mainfont="Georgia" -V monofont="Menlo" -V fontsize=10pt \
  -o "$BUILD/book.pdf"

echo "Built $BUILD/book.md, $BUILD/book.epub and $BUILD/book.pdf"
