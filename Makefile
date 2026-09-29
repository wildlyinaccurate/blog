# Builds the second edition of A Hacker's Guide to Git from the blog's MDX.
#
#   make book       # EPUB + PDF in build/
#   make diagrams   # regenerate the SVGs in public/uploads/a-hackers-guide-to-git/
#   make demos      # re-run every terminal session in the book with your local git

.PHONY: book diagrams demos clean

book:
	book/build.sh

diagrams:
	node book/diagrams.mjs

demos:
	book/demo.sh build/demo build/transcripts

clean:
	rm -rf build
