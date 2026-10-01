# A Hacker's Guide to Git, second edition

The book is written as blog posts: `content/post/a-hackers-guide-to-git.mdx` is
the introduction and table of contents, and each chapter is a file in
`content/post/a-hackers-guide-to-git/`. The diagrams are SVGs in
`public/uploads/a-hackers-guide-to-git/`. This directory holds the tooling
that turns those posts into a book.

## Building the EPUB and PDF

    brew install pandoc typst
    make book

`build.sh` concatenates the introduction and the chapters (in the order
listed in the introduction), strips the blog-only navigation, and runs pandoc
twice: once for `build/book.epub` and once for `build/book.pdf` via typst.
The intermediate Markdown is left at `build/book.md` if you want to feed it to
something else. Title, author and cover metadata live in `metadata.yaml`, and
`epub.css` styles the EPUB.

## Diagrams

    make diagrams

`diagrams.mjs` describes every diagram as a handful of shapes and arrows and
writes the SVGs. Edit the description and re-run, or open an SVG in a vector
editor if a one-off tweak is easier.

## Terminal sessions

    make demos

`demo.sh` re-creates every terminal session in the book against whichever
`git` is on your PATH, with fixed author, committer and timestamps so that
object hashes match the book. The transcripts land in `build/transcripts/`,
one file per chapter, and diffing them against the code blocks in the chapters
is the quickest way to find out what a new Git release has changed.

## Interactive elements

Some chapters embed interactive components (`components/hackers-guide/`):
a repository playground, the three-trees stepper, a hash explorer, a
revision-syntax explorer, a bisect stepper and a conflict-marker toggle. They
are registered as Tina templates in `tina/collections/post.js` and rendered
by `components/Post.js`. In the MDX they look like
`<HashExplorer fallback="/uploads/…/object-hash.svg" alt="…" />`. The build
script swaps each one for its `fallback` image, or for a one-line pointer to
the web version when there is no fallback because the chapter already shows
the equivalent static diagram.
