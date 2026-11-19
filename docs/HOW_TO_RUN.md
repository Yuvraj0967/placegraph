# How to run PlaceGraph (simple guide)

You do **not** need to know MySQL or Neo4j. You only type a few commands. Total time: about 10 minutes the first time (most of it is downloading).

## What you need (install once)

| Tool | Why | How to check it is installed |
|---|---|---|
| **Docker Desktop** | Runs the two databases (MySQL and Neo4j) for you | Open it; wait until it says "Engine running" |
| **Node.js 20 or newer** | Runs the website | `node -v` shows `v20` or higher |
| **Git** (optional) | To download the project | `git --version` |

## Step 1: Get the project

```bash
git clone https://github.com/Yuvraj0967/placegraph.git
cd placegraph
```

(No Git? On the GitHub page click **Code -> Download ZIP**, unzip it, and open a terminal inside the folder.)

## Step 2: Start Docker Desktop

Open **Docker Desktop** and wait until it says it is running. Leave it open the whole time. If it is not running, the next steps fail with a message about `dockerDesktopLinuxEngine`.

## Step 3: Install and set up (first time only)

Run these three commands, one after the other, in the project folder:

```bash
npm install
npm run setup
npm run build
```

What they do, in plain words:

| Command | What happens |
|---|---|
| `npm install` | Downloads the libraries the website needs |
| `npm run setup` | Creates a private `.env` file with **random passwords**, starts MySQL and Neo4j, builds all the tables, triggers and procedures, loads the sample data, creates the login accounts and builds the graph. You will see `OK: MySQL and Neo4j are in sync.` at the end |
| `npm run build` | Prepares the website |

## Step 4: Start the website

```bash
npm start
```

Open **http://localhost:3001** in your browser. Keep this terminal window open while you use the site.

## Step 5: Log in

The login page asks for a **username (or email)** and a password.

| Username | Role | What you can do |
|---|---|---|
| `officer` | Placement officer | Everything: manage data, run the recruitment workflow, Users page, Trigger Lab, DB Inspector |
| `tpo` | Placement officer | Same as `officer` (a second officer account) |
| `aarav`, `diya`, `rohan`, `sneha`, `kabir`, `meera`, `arjun`, `ananya`, `vikram`, `isha`, `neha`, `rahul` | Student (each linked to the student with that first name) | See jobs, apply as themselves, see only their own applications, interviews, placement and job matches |

Each student's email is `<name>@college.edu` (for example `meera@college.edu`); you can log in with the username or the email.

**Where are the passwords?** In the private file `.env` in the project folder (it is never uploaded to GitHub). Open it and look for two lines:

- `DEMO_OFFICER_PASSWORD=...` is the password for `officer` and `tpo`
- `DEMO_STUDENT_PASSWORD=...` is the password for all the student accounts

On Windows you can show them with:

```powershell
findstr DEMO .env
```

Officers can add more usernames on the **Users** page (or with `npm run user:create -- <username> <email> <password> <officer|student> [student_id]`).

## Everyday use

| I want to... | Do this |
|---|---|
| Open the project again later | Start Docker Desktop, then `npm start` |
| Put the sample data back to how it was | `npm run db:setup` (this erases changes and resets everything, including the accounts) |
| Stop the website | Press `Ctrl + C` in its terminal |
| Stop the databases | `docker compose stop` |
| Start the databases again | `docker compose start` (or `npm run db:up`) |
| Check everything works | `npm run db:setup`, then `npm test` (38 tests should pass; the website must be running) |
| Look inside MySQL | `docker exec -it -e MYSQL_PWD=YOUR_MYSQL_ROOT_PASSWORD placegraph-mysql mysql -uroot placegraph` then try `SHOW TABLES;` (the password is `MYSQL_ROOT_PASSWORD` in `.env`) |
| Look at the graph | Open http://localhost:7475, user `neo4j`, password `NEO4J_PASSWORD` from `.env`, then run `MATCH (n) RETURN n LIMIT 80` |

## If something goes wrong

| What you see | What to do |
|---|---|
| `failed to connect to the docker API ... dockerDesktopLinuxEngine` | Docker Desktop is not running. Start it and wait, then repeat the command |
| `Missing environment variable ...` | The `.env` file is missing. Run `npm run init`, then `npm run setup` |
| `port is already allocated` / `address already in use` | Something else uses port 3001, 3308, 7475 or 7688. Close it, or change the number in `.env` and `docker-compose.yml` |
| Setup waits a long time at "Waiting for Neo4j" | Neo4j needs up to a minute to start. Wait; if it fails run `npm run db:setup` again |
| `EINVAL: invalid argument, readlink ... .next` while building | Happens when the folder is inside OneDrive. Delete the `.next` folder, run `npm run build` again, or move the project out of OneDrive |
| Login says "Invalid email or password" | Check the username and copy the password from `.env` exactly. After `npm run db:setup` the accounts are recreated with the passwords in `.env` |
| The page is blank or shows errors after `db:setup` | Refresh the page; if it still fails restart `npm start` |
| Tests fail | Run `npm run db:setup` first (tests need fresh sample data) and make sure `npm start` is running |

## What to read next

- [BUTTON_LIFECYCLE.md](BUTTON_LIFECYCLE.md): what happens, step by step, when you click each button
- [SCHEMA_GUIDE.md](SCHEMA_GUIDE.md): the database tables explained simply
- [DEMO_GUIDE.md](DEMO_GUIDE.md): exact steps to show every item on the teacher's requirement list
