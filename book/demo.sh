#!/usr/bin/env bash
#
# Re-creates every terminal session shown in the book, using whichever git is
# on your PATH, and writes one transcript per chapter. Run it after upgrading
# git to see which examples in the book have gone stale.
#
#   book/demo.sh <work-dir> <transcript-dir>
#
# Author, committer and timestamps are fixed so that object hashes are stable
# between runs.

set -u

WORK=$(cd "$(mkdir -p "$1" && echo "$1")" && pwd)
OUT=$(cd "$(mkdir -p "$2" && echo "$2")" && pwd)
rm -rf "$WORK" "$OUT" && mkdir -p "$WORK" "$OUT"

export HOME="$WORK"
export GIT_CONFIG_NOSYSTEM=1
export GIT_CONFIG_GLOBAL="$WORK/.gitconfig"
export GIT_AUTHOR_NAME="Joseph Wynn"
export GIT_AUTHOR_EMAIL="joseph@wildlyinaccurate.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
export LANG=C LC_ALL=C
export PAGER=cat GIT_PAGER=cat
export TZ=UTC

CLOCK=1780000000
tick() {
  CLOCK=$((CLOCK + 60))
  export GIT_AUTHOR_DATE="$CLOCK +1200"
  export GIT_COMMITTER_DATE="$CLOCK +1200"
}
tick

cat > "$GIT_CONFIG_GLOBAL" <<CFG
[user]
	name = Joseph Wynn
	email = joseph@wildlyinaccurate.com
[init]
	defaultBranch = main
[color]
	ui = false
[core]
	pager = cat
CFG

TRANSCRIPT=""
section() {
  TRANSCRIPT="$OUT/$1.txt"
  : > "$TRANSCRIPT"
}

# Print the command the way it appears in the book, then run it.
t() {
  {
    echo "\$ $*"
    eval "$@" 2>&1
    echo
  } | sed -e "s#$WORK#/home/demo#g" \
          -e "s#$(id -un)  *[a-z]*#demo demo#g" \
          -e 's/^\([-dlrwx]\{10\}\)@/\1 /' \
          -e 's/Rebasing ([0-9]*\/[0-9]*)//g' >> "$TRANSCRIPT"
}

# Run silently (setup that the book doesn't show).
q() { eval "$@" >/dev/null 2>&1; }

note() { echo "### $*" >> "$TRANSCRIPT"; }

commit() { tick; git commit -q -a -m "$1"; }

# ---------------------------------------------------------------------------
section 01-repositories
cd "$WORK" && mkdir demo-repository && cd demo-repository
t git init
t ls -l .git
t cat .git/HEAD
t cat .git/config
t 'find .git -type f -not -path "*/hooks/*"'

# ---------------------------------------------------------------------------
section 02-objects
cd "$WORK" && mkdir objects && cd objects && q git init
t "echo 'This is the readme.' > README"
t git hash-object README
t "printf 'blob 20\\0This is the readme.\\n' | shasum"
t 'find .git/objects -type f'
t git hash-object -w README
t 'find .git/objects -type f'
t git cat-file -t 9761654
t git cat-file -s 9761654
t git cat-file -p 9761654
t "python3 -c 'import sys, zlib; print(zlib.decompress(sys.stdin.buffer.read()))' \\
    < .git/objects/97/61654c68d36874ac2184210502a0d2d116e817"
cd "$WORK"
t git init --object-format=sha256 sha256-repository
t "echo 'This is the readme.' | git -C sha256-repository hash-object --stdin"
t "cat sha256-repository/.git/config"

# ---------------------------------------------------------------------------
section 03-trees
cd "$WORK" && mkdir trees && cd trees && q git init
q "echo 'This is the readme.' > README"
q "mkdir src && printf '#include <stdio.h>\\n\\nint main() {\\n    puts(\"Hello, world!\");\\n}\\n' > src/hello.c"
t 'find . -type f -not -path "./.git/*"'
t git add .
t git write-tree
ROOT=$(git write-tree)
SRC=$(git rev-parse --short "$ROOT:src")
HELLO=$(git rev-parse --short "$ROOT:src/hello.c")
t git cat-file -p ${ROOT:0:7}
t git cat-file -p $SRC
t git cat-file -p $HELLO
t git ls-tree -r -t ${ROOT:0:7}

# ---------------------------------------------------------------------------
section 04-commits
cd "$WORK" && mkdir simple-repository && cd simple-repository && q git init
t "echo 'This is the readme.' > README"
t git add README
t 'git commit -m "First commit"'
t git cat-file -p HEAD
t git cat-file -t HEAD
t git show --format=raw
t git log --oneline
t git rev-parse --short HEAD
FIRST=$(git rev-parse HEAD)
t "git show --oneline -s ${FIRST:0:4}"
t "git show --oneline -s ${FIRST:0:3}"

# ---------------------------------------------------------------------------
section 05-index
cd "$WORK/simple-repository"
t 'ls -l .git/index'
t git ls-files --stage
t "echo 'Some more information here.' >> README"
t git status --short
t git ls-files --stage
t git add README
t git ls-files --stage
t 'find .git/objects -type f'
t git status --short
t git diff
t git diff --staged
t git restore --staged README
t git ls-files --stage
t git status --short
note "plumbing a commit by hand"
t git update-index --add README
t git ls-files --stage
t git write-tree
TREE=$(git write-tree)
tick
t "git commit-tree ${TREE:0:7} -p HEAD -m 'Update README (by hand)'"
NEWC=$(git commit-tree $TREE -p HEAD -m 'Update README (by hand)')
t git log --oneline
t "git update-ref refs/heads/main $NEWC"
t git log --oneline
t git status --short

# ---------------------------------------------------------------------------
section 06-references
cd "$WORK/simple-repository"
q git reset -q --hard HEAD~1
t git status
t 'ls -l .git/refs/heads/'
t cat .git/refs/heads/main
t git show --oneline -s main
t git rev-parse main
t cat .git/HEAD
t git symbolic-ref HEAD
t git rev-parse HEAD
t "git switch --detach"
t cat .git/HEAD
t git switch main
note "packed refs"
t git pack-refs --all
t 'ls -l .git/refs/heads/'
t cat .git/packed-refs
t git rev-parse main
t git for-each-ref
note "revision syntax"
cd "$WORK" && mkdir revisions && cd revisions && q git init
for n in A B C D; do q "echo $n > file.txt"; q "git add file.txt"; commit "$n"; done
q git switch -q -c topic HEAD~1
q "echo E > other.txt"; q git add other.txt; commit "E"
q git switch -q main
q git merge -q --no-edit topic
t git log --oneline --graph
t git show -s --oneline HEAD~1
t git show -s --oneline HEAD~2
t git show -s --oneline HEAD^1
t git show -s --oneline HEAD^2
t git show -s --oneline 'HEAD^2~1'
t "git log --oneline HEAD~2..HEAD"
t "git log --oneline ':/Merge'"
t "git rev-parse --short 'main@{1}'"
t "git show --oneline -s 'main:file.txt'"
t "git show 'main:file.txt'"
note "reftable"
cd "$WORK"
t git init --ref-format=reftable reftable-repository
t 'ls reftable-repository/.git/refs reftable-repository/.git/reftable'
t 'cat reftable-repository/.git/refs/heads'

# ---------------------------------------------------------------------------
section 07-branches
cd "$WORK/simple-repository"
t git branch test-branch
t cat .git/refs/heads/test-branch
t cat .git/HEAD
t git switch test-branch
t cat .git/HEAD
t git branch --show-current
t "echo 'Some more information here.' >> README"
t git add README
tick
t 'git commit -m "Update README in a new branch"'
t cat .git/refs/heads/test-branch
t git switch main
t git branch
t git branch -m test-branch readme-updates
t git branch
t git branch -d readme-updates
t git branch -D readme-updates

# ---------------------------------------------------------------------------
section 08-tags
cd "$WORK/simple-repository"
t git tag 1.0-lightweight
t cat .git/refs/tags/1.0-lightweight
t git cat-file -t 1.0-lightweight
t git cat-file -p 1.0-lightweight
t git cat-file -p 39f6ea2
tick
t 'git tag -a -m "Tagged 1.0" 1.0'
t cat .git/refs/tags/1.0
t git cat-file -t 1.0
t git cat-file -p 1.0
t "git rev-parse 1.0 '1.0^{commit}'"
note "ssh signing"
q "ssh-keygen -q -t ed25519 -N '' -C joseph@wildlyinaccurate.com -f $WORK/.ssh-signing-key"
t "git config set --global gpg.format ssh"
t "git config set --global user.signingKey ~/.ssh-signing-key.pub"
tick
t 'git tag -s -m "Tagged 1.1" 1.1'
t git cat-file -p 1.1
t "echo \"joseph@wildlyinaccurate.com \$(cat ~/.ssh-signing-key.pub)\" \\
    > ~/.allowed-signers"
t "git config set --global gpg.ssh.allowedSignersFile ~/.allowed-signers"
t git verify-tag 1.1
t git tag
t git tag -n
git config unset --global gpg.format; git config unset --global user.signingKey; git config unset --global gpg.ssh.allowedSignersFile

# ---------------------------------------------------------------------------
section 09-merging
cd "$WORK" && mkdir merging && cd merging && q git init
q "printf '<h1>Welcome</h1>\\n<p>This is our website.</p>\\n' > index.html"
q git add index.html
commit "Initial commit"
t git switch -c feature-branch
t "echo '<p>Our shiny new feature.</p>' > feature.html"
t git add feature.html
tick
t 'git commit -m "Finished the new feature"'
t git switch main
t git switch -c hotfix
t "sed -i '' 's/This is our website/This is our web site/' index.html"
tick
t 'git commit -am "Fixed some wording"'
t git log --oneline --graph --all
t git switch main
t git merge hotfix
t git log --oneline --graph --all
t git merge-base main feature-branch
tick
t git merge --no-edit feature-branch
t git log --oneline --graph
t "git show --format=raw -s HEAD"
note "conflicts"
q git switch -q -c conflicting-branch HEAD~2
q "sed -i '' 's/Welcome/Welcome!/' index.html"
commit "Add some excitement"
q git switch -q main
q "sed -i '' 's/Welcome/Welcome, friend/' index.html"
commit "Be more friendly"
t git log --oneline --graph --all
tick
t git merge conflicting-branch
t git status
t cat index.html
t git merge --abort
t git config set merge.conflictStyle zdiff3
tick
t git merge conflicting-branch
t cat index.html
t "printf '<h1>Welcome, friend!</h1>\\n<p>This is our web site.</p>\\n<p>Our shiny new feature.</p>\\n' > index.html"
t git add index.html
tick
t "git merge --continue"
t git log --oneline --graph
note "no-ff / ff-only / squash"
q git switch -q -c another-hotfix
q "echo 'Even more content.' > more.html"; q git add more.html; commit "Add more content"
q git switch -q main
tick
t git merge --ff-only feature-branch
t git merge --ff-only conflicting-branch
tick
t "git merge --no-ff --no-edit another-hotfix"
t git log --oneline --graph
q git reset -q --hard HEAD~1
t git merge --squash another-hotfix
t git status --short
tick
t 'git commit -m "Add more content (squashed)"'
t git log --oneline --graph

# ---------------------------------------------------------------------------
section 10-cherry-picking
cd "$WORK" && mkdir picking && cd picking && q git init
for n in A B; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q -c foo
for n in C D; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q main
for n in E F; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q foo
t git log --oneline --graph --all
t git switch --detach foo
F=$(git rev-parse --short main)
tick
t "git cherry-pick $F"
t git log --oneline --graph --all
t "git show --format=raw -s $F"
t "git show --format=raw -s HEAD"
# the long way round
q git switch -q foo
t git switch main
t git switch -c foo-tmp
C=$(git rev-parse --short foo~1); D=$(git rev-parse --short foo)
tick
t "git cherry-pick $C $D"
t git log --oneline --graph --all
t git switch foo
t git reset --hard foo-tmp
t git branch -D foo-tmp
t git log --oneline --graph --all

# ---------------------------------------------------------------------------
section 11-rebasing
cd "$WORK" && mkdir rebasing && cd rebasing && q git init
for n in A B; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q -c foo
for n in C D; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q main
for n in E F; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
t git log --oneline --graph --all
tick
t git rebase main foo
t git log --oneline --graph --all
t git switch main
t git merge foo
t git log --oneline --graph --all
note "onto"
q git switch -q -c bar main~2
for n in G H; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q -c baz
for n in I J; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
t git log --oneline --graph --all
tick
t git rebase --onto main bar baz
t git log --oneline --graph --all
note "update-refs"
q git switch -q -c part-1 main
for n in K L; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q -c part-2
for n in M N; do q "echo $n > $n.txt"; q "git add $n.txt"; commit "$n"; done
q git switch -q main
q "echo O > O.txt"; q git add O.txt; commit "O"
t git log --oneline --graph main part-1 part-2
tick
t git rebase --update-refs main part-2
t git log --oneline --graph main part-1 part-2
note "interactive"
q git switch -q -c wip main
q "echo 'Hello' > greeting.txt"; q git add greeting.txt; commit "Add greeting"
q "echo 'Goodbye' > farewell.txt"; q git add farewell.txt; commit "Add farewell"
q "echo 'Hello, world' > greeting.txt"; q git add greeting.txt
tick
t "git commit --fixup HEAD~1"
t git log --oneline main..wip
tick
t "GIT_SEQUENCE_EDITOR=cat git rebase -i --autosquash main"
t git log --oneline main..wip
t git reflog -n 5
t git rev-parse --short ORIG_HEAD
q git config set rebase.autoSquash true
note "conflicts during rebase"
q git switch -q -c conflicting main
q "echo 'one' > shared.txt"; q git add shared.txt; commit "Add shared file"
q git switch -q main
q "echo 'uno' > shared.txt"; q git add shared.txt; commit "Add shared file (Spanish)"
tick
t git rebase main conflicting
t git status
t "echo 'one / uno' > shared.txt"
t git add shared.txt
tick
t "GIT_EDITOR=true git rebase --continue"
t git log --oneline --graph main conflicting

# ---------------------------------------------------------------------------
section 12-remotes
cd "$WORK" && mkdir bare-repo && cd bare-repo
t git init --bare
t 'ls -l'
t cat HEAD
t cat config
t touch README
t git add README
cd "$WORK"
t git clone bare-repo/ clone-of-bare-repo
t cd clone-of-bare-repo/
cd clone-of-bare-repo
t 'find . -type f -not -path "./.git/hooks/*"'
t cat .git/HEAD
t cat .git/config
t git remote -v
t git remote show origin

# ---------------------------------------------------------------------------
section 13-pushing
cd "$WORK/clone-of-bare-repo"
t "echo 'Project v1.0' > README"
t git add README
tick
t 'git commit -m "Add readme"'
t cat .git/refs/heads/main
FIRST=$(git rev-parse --short HEAD)
t git push origin main
t cat ../bare-repo/refs/heads/main
t "git -C ../bare-repo show $FIRST"
t git switch -c feature-branch
t git push
t git push -u origin feature-branch
t cat .git/config
t git push
note "force with lease"
cd "$WORK"
q git clone -q bare-repo/ second-clone
cd second-clone
q git switch -q feature-branch
q "echo 'Written in the second clone.' >> README"; commit "Update README from the second clone"
q git push -q origin feature-branch
cd "$WORK/clone-of-bare-repo"
tick
t 'git commit --amend --no-edit -m "Add readme (amended)"'
t git push --force-with-lease origin feature-branch
t git fetch origin
t git log --oneline --all
q git reset -q --hard origin/feature-branch

# ---------------------------------------------------------------------------
section 14-fetching
cd "$WORK/clone-of-bare-repo"
t git config get remote.origin.fetch
t 'ls -l .git/refs/remotes/origin/'
t git -C ../bare-repo branch experiment main
t git fetch origin
t cat .git/refs/remotes/origin/experiment
t cat .git/FETCH_HEAD
t git branch
t git branch -r
t git switch experiment
t git branch -vv
t "git config get --show-names --regexp '^branch\\.experiment'"
t git rev-parse --abbrev-ref '@{upstream}'
note "prune"
t git -C ../bare-repo branch -d experiment
t git fetch origin
t git branch -r
t git fetch --prune origin
t git branch -r
q git switch -q main
q git branch -q -D experiment
note "shallow and partial clones"
cd "$WORK"
t "git clone --depth 1 file://$WORK/bare-repo shallow-clone"
t cat shallow-clone/.git/shallow
t git -C shallow-clone log --oneline
q git -C bare-repo config set uploadpack.allowFilter true
t "git clone --filter=blob:none file://$WORK/bare-repo partial-clone"
t "git -C partial-clone config get --show-names remote.origin.partialclonefilter"
t "git -C partial-clone count-objects -v | head -3"
t "git -C partial-clone cat-file -t HEAD:README"

# ---------------------------------------------------------------------------
section 15-pulling
cd "$WORK/second-clone"
q git switch -q main
q git pull -q
t "echo 'Some more information.' >> README"
tick
t 'git commit -am "Add more information to readme"'
t git push origin main
cd "$WORK/clone-of-bare-repo"
q git switch -q main
t git fetch origin
t cat .git/FETCH_HEAD
t cat .git/refs/heads/main
t cat .git/refs/remotes/origin/main
t git merge FETCH_HEAD
t git reset --hard HEAD~1
t git pull origin main
note "divergent branches"
t git reset --hard HEAD~1
t "echo 'A local change.' > LOCAL"
t git add LOCAL
tick
t 'git commit -m "Add a local file"'
t git log --oneline --graph --all
t git pull
t git pull --no-rebase --no-edit
t git log --oneline --graph
t git reset --hard 'HEAD^1'
tick
t git pull --rebase
t git log --oneline --graph --all
q git reset -q --hard origin/main

# ---------------------------------------------------------------------------
section 16-worktrees
cd "$WORK/clone-of-bare-repo"
t git worktree list
t git worktree add ../hotfix-worktree -b hotfix
t 'ls -la ../hotfix-worktree'
t cat ../hotfix-worktree/.git
t 'ls .git/worktrees/hotfix-worktree'
t cat .git/worktrees/hotfix-worktree/HEAD
t git worktree list
cd ../hotfix-worktree
t "echo 'Fix the thing.' > FIX"
t git add FIX
tick
t 'git commit -m "Fix the thing"'
cd ../clone-of-bare-repo
t git log --oneline hotfix
t git switch hotfix
t git worktree remove ../hotfix-worktree
t git worktree list
t git branch -D hotfix

# ---------------------------------------------------------------------------
section 17-stashing
cd "$WORK" && mkdir stashing && cd stashing && q git init
t "echo 'Foo' > test.txt"
t git add test.txt
tick
t 'git commit -m "Initial commit"'
t "echo 'Bar' >> test.txt"
tick
t git stash
t cat test.txt
t git stash list
t git show --format=raw -s 'stash@{0}'
t git log --oneline
t git branch
t git fsck --lost-found
t git show-ref
t cat .git/refs/stash
t "git show --format=raw -s 'stash@{0}^2'"
t "git show 'stash@{0}^2:test.txt'"
t "git show 'stash@{0}:test.txt'"
t "echo 'Bar' >> test.txt"
t "echo 'Untracked' > untracked.txt"
tick
t git stash push --include-untracked
t "git show --format=raw -s 'stash@{0}'"
t "git ls-tree 'stash@{0}^3'"
t git stash list
t git reflog stash
t git stash pop
t git stash list

# ---------------------------------------------------------------------------
section 18-recovering
cd "$WORK" && mkdir recovering && cd recovering && q git init
q "touch README"; q git add README; commit "Add empty readme"
q "echo 'TODO: write the readme' > README"; q git add README; commit "Add TODO note to readme"
q "echo 'This project does things.' > README"; q git add README; commit "Add some actual content to readme"
q "touch LICENSE"; q git add LICENSE; commit "Add empty LICENSE file"
t git log --oneline
t git reset --hard HEAD~2
t git log --oneline
t git reflog
t "git reset --hard 'HEAD@{1}'"
t git log --oneline
note "branch reflog"
t git reflog show main
t "git log --oneline -1 'main@{2}'"
note "fsck"
t git switch -c feature-branch
t "echo 'A feature' > feature.txt"
t git add feature.txt
tick
t 'git commit -m "Add a feature"'
DANGLING=$(git rev-parse --short HEAD)
t git switch main
t git branch -D feature-branch
t git fsck --lost-found
t "git show --oneline -s $DANGLING"
t "git branch feature-branch $DANGLING"
t git log --oneline feature-branch

# ---------------------------------------------------------------------------
section 19-packfiles
cd "$WORK/recovering"
q git branch -D feature-branch
t git count-objects -v
t 'find .git/objects -type f | head -5'
t git gc
t git count-objects -v
t 'ls .git/objects/pack/'
for p in .git/objects/pack/*.idx; do t "git verify-pack -v ${p:0:30}*.idx"; done
t "git config get --show-names --regexp 'gc\\.(reflogExpire|pruneExpire)' || echo '(not set: defaults are 90 days and 2 weeks)'"
t git fsck --lost-found
t "git cat-file -t $DANGLING"
t git reflog expire --expire=now --all
t git gc --prune=now
t git fsck --lost-found
t "git cat-file -t $DANGLING"
t 'ls .git/objects/info/'

# ---------------------------------------------------------------------------
section 20-bisecting
cd "$WORK" && mkdir bisecting && cd bisecting && q git init
cat > test.sh <<'SH'
#!/bin/sh
grep -q 'return total' calculate.sh
SH
chmod +x test.sh
q "echo 'return total' > calculate.sh"
q git add calculate.sh test.sh
commit "Add calculator"
for i in $(seq 1 12); do
  if [ "$i" -eq 7 ]; then q "echo 'return totl' > calculate.sh"; fi
  q "echo \"# change $i\" >> notes.txt"; q git add notes.txt calculate.sh
  commit "Change $i"
done
q git tag v1.0 HEAD~12
t git log --oneline
t ./test.sh
t git bisect start
t git bisect bad
t git bisect good v1.0
t ./test.sh
t git bisect good
t ./test.sh
t git bisect bad
t ./test.sh
t git bisect bad
t git bisect reset
note "bisect run"
t git bisect start HEAD v1.0
t git bisect run ./test.sh
t git bisect reset

# ---------------------------------------------------------------------------
section 21-useful
cd "$WORK/rebasing"
t git log --oneline --graph --all
t git rev-parse HEAD
t git rev-parse --short HEAD
t git branch --contains main~3
t "git log --oneline main..conflicting"
t "git log --oneline --cherry-pick --right-only main...conflicting"
t git cat-file -p HEAD
t git cat-file -t HEAD
t git cat-file -s HEAD
t git ls-tree -r -t HEAD
t "git show 'HEAD~1:shared.txt'"
q git tag -a -m "v1.0" v1.0 main~5
t git describe main
t git describe --abbrev=0 main
t git describe --tags --exact-match v1.0
t "git log --oneline --all -S 'Hello, world'"
t "git log --oneline -L 1,1:greeting.txt wip"
t "git log --oneline --format='%h %as %an: %s' -3"
t git shortlog -sn --all
t "git range-diff main...wip"
t git blame -s wip -- farewell.txt
t git diff --stat main..wip
t git log --oneline --first-parent -3 main
t git rev-list --count main
t git show-ref --heads

echo "Transcripts written to $OUT"
