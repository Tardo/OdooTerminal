# Contributing

## Pre-commit

If you want collaborate, you need this to make octocat happy.

#### Installation

`husky` need be run inside of the project folder.

```
npm install
```

#### Usage

After install, when you do a commit all linters, prettiers, etc.. will run
automatically ;)

But, if you want you can run it manually:

```
pre-commit run -a
```

If one step fails the commit will be cancelled, try do it again (surely husky
was changed some files, no problem, it's his job, add them again).
