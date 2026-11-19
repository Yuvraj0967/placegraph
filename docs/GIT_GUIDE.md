# GitHub workflow and contribution evidence

The project is a Git repository. The first commit imports the finished project; commits made later should each record work a member actually did or reviewed. An import commit does not by itself show who wrote which file.

## Put the repository on GitHub (once)

1. On GitHub create an empty repository (no README, no .gitignore), for example `placegraph`.
2. In the project folder:

```bash
git remote add origin https://github.com/YOUR_USERNAME/placegraph.git
git branch -M main
git push -u origin main
```

3. Add your teammate under **Settings -> Collaborators**. They accept the invitation from their own account.

`.env` is git-ignored, so no secrets are pushed. Check with `git status` and `git ls-files | grep .env` (only `.env.example` should appear).

## Each member's own work

Every member configures **their own** identity and works on a branch:

```bash
git clone https://github.com/YOUR_USERNAME/placegraph.git
cd placegraph
git config user.name "Your Name"
git config user.email "your-github-email"
npm install && npm run setup
git switch -c feature/short-description
# make and test a real change (npm test)
git add path/to/changed/files
git commit -m "feat(sql): describe the actual change"
git push -u origin feature/short-description
```

Open a pull request; the other member reviews the diff and the test results. Do this for a change on the database side (`docs/sql/`, `tests/01-sql.test.mjs`) **and** on the application side (`app/`, `lib/`) so each member has evidence for both.

Suggested commit prefixes: `feat(sql):`, `feat(graph):`, `feat(ui):`, `fix(api):`, `test:`, `docs:`.

## Do not

Rewrite the import commit, backdate commits, use another person's identity, or make changes only to alter contribution statistics.

## For the demonstration

Show `git shortlog -sn --all`, `git log --author="Name"` for each member, pull request reviews, and be ready to explain the files each member claims. Commit counts alone do not establish contribution.
