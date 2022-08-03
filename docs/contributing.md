# Contributing

## Pre-commit

If you want collaborate, you need this to make travis happy.

#### Installation

`pre-commit` command need be run inside of the project folder.

```
pip install pre-commit
pre-commit install -f
```

#### Usage

After install, when you do a commit all linters, prettiers, etc.. will run
automatically ;)

But, if you want you can run it manually:

```
pre-commit run -a
```

If one step fails the commit will be cancelled, try do it again (surely
pre-commit was changed some files, no problem, it's his job, add them again).
The only step thats require manual action if fails (very rare to happen) is the
last ('web-ext').

---

Testing: [testing.md](./testing.md)

Hacking Terminal: [javascript.md](./javascript.md)
