# Price Table

A simple application that displays a price chart for various assets.

## Deployment

1) Run the update procedures:

```bash
npm outdated
```

```bash
npm install -g npm-check-updates
```

```bash
ncu -u
```

```bash
npm update
```

2) Build:

```bash
npm run build
```

3) Complete the build by going into the `dist` folder.

```bash
cd ./dist
```

Once inside the `dist` folder, run the following command to re-install all of
the modules.

```bash
npm install
```

4) Launch the server with the following command:

```bash
npm run start:server
```

## Troubleshooting

### Getting Real-time Markdown Preview

The real-time markdown preview functionality should be provided by the `:LivedownPreview`
command in vim, using the [Livedown](https://github.com/shime/livedown) plugin.

### Creating Runners

It is adviced to have a dedicated tmux session that will be running any
servers. Just start a new session, call it *run* and then create a pane inside
that called *server*, this will be a pane dedicated to running the server. You
can later send tmux commands into that session to interract with it without
actually needing to leave the development session.

Use the following script to beautify the prompt of the runner:
```bash
source ../../scripts/env.sh
```

### Listing and Flushing Ports

On some instances, the grunt process might be killed and the port maybe left
occupied. Such situations may require to list the process that is using the
specific port. These commands are quite useful in general when it comes to
troubleshooting any stuck ports.

To list who is on a specific port, use the following command:
```bash
lsof -nP -i:${PORT} | grep LISTEN
```

For example:
```bash
lsof -nP -i:1337 | grep LISTEN
```

should report something like:
```bash
47075   username    39u     IPv6 0xf4b4b966fa1438e7     0t0 TCP *:1337  (LISTEN)
```

Once we know the `pid` of the process occupying that specific port, we can
easily kill it using the following command:
```bash
kill -s KILL 47075
```

### Handling tmux Workflows

It is possible to send tmux commands into tmux panes without actually having to
interract with those sessions. Here are some examples:
```bash
# To clear the runner's server pane.
tmux send-keys -t run:server C-z 'clear' C-m
```
```bash
# To send CTRL-C in order to terminate a running process.
tmux send-keys -t run:server C-c
```

## Version History

*   v0.0.3: Fixed time-interval bug, fixed data.query() shallow-copy bug.
*   v0.0.4: Fixed an uuid v1 issue, fixed a mistake in the deployment script,
    updated the README.md file. 


## Authors

**cryptoeraser** - [twitter/@cryptoeraser](https://twitter.com/cryptoeraser)
** mbilyanov** - [twitter/@mbilyanov](https://twitter.com/mbilyanov)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

