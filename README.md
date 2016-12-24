# Node DNS Filter

Filter adverts and other domains out of your web browsing experience - mobile, desktop, tablet.

## Installation

This project requires Node >=6 and npm 2

Run `npm install -g node-dns-filter` (may require `sudo` in some cases for global install)

## Update Domain Lists

Run the updater tool found in the `bin` directory:

```
node bin/update.js
```

And that will delete then recreate the 'domains.list' file by fetching a new list of URLS and joining it with your custom blacklist.

You can do this manually if you so desire, but make sure the list is URLs only, one per line.

## Running

I'd recommend using a tool like `nodemon` to keep the process alive (or use your favourite alternative).

This requires `sudo` as port 53 is a privileged port.

Run with:

```
sudo nodemon node-dns
```

Now point your DNS settings to the IP address of whatever is running this program.

Enjoy ad free browsing!!

## Notes

This doesn't hide the ad elements - so use this in conjunction with an ad blocking extension on desktop to hide them as well. When websites complain or otherwise prevent you from using their site, just disable the ad blocker extension and continue browsing ad-free.

## Credits

The basic functionality was derived from the code from [Pēteris Ņikiforovs's blog](https://peteris.rocks/blog/dns-proxy-server-in-node-js-with-ui/).

Admin interface derived from [Pi-Hole](https://github.com/pi-hole/AdminLTE) and [DashGum](https://github.com/esironal/dashgum-template).

Created by [Jack Burgess](https://github.com/jack828).

## License

MIT

Please feel free to improve this, I'd really appreciate a pull request or two.
