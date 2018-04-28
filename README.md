# Node DNS Filter

Filter adverts and other domains out of your web browsing experience - mobile, desktop, tablet.

## Installation

This project requires Node >=6 and npm 2

```
$ git clone https://github.com/jack828/NodeDNSFilter.git
$ cd NodeDNSFilter
$ yarn install
```

## Update Domain Lists

Run the updater tool found in the `bin` directory:

```
node bin/update.js
```

And that will delete then recreate the 'domains.list' file by fetching a new list of URLS and joining it with your custom blacklist.

You can do this manually if you so desire, but make sure the list is URLs only, one per line.

## Running

This requires `sudo` as port 53 is a privileged port.

Run with:

```
sudo yarn run [dev|start]
```

Now point your DNS settings to the IP address of whatever is running this program.

Enjoy ad free browsing!!

## Customisation

You can change the following settings using environment variables:

| Variable |    Default    |               Description                |
|----------|---------------|------------------------------------------|
| PORT     | 80            | The port the admin interface listens on. |
| DNS_PORT | 53            | The port the DNS server listens on.      |
| LOG_FILE | `./logs/log`  | The location logs are saved to.          |
| NODE_ENV | `development` | The environment used.                    |

## Admin Interface

Set the DNS server on whatever connection you're using to the IP address of the machine running it.

Then, navigate to the following (customisable) address:

```
http://admin.nodedns/
```

## Notes

This doesn't hide the ad elements - so use this in conjunction with an ad blocking extension on desktop to hide them as well. When websites complain or otherwise prevent you from using their site, just disable the ad blocker extension and continue browsing ad-free.

## Credits

The basic functionality was derived from the code from [Pēteris Ņikiforovs's blog](https://peteris.rocks/blog/dns-proxy-server-in-node-js-with-ui/).

Admin interface derived from [Pi-Hole](https://github.com/pi-hole/AdminLTE) and [DashGum](https://github.com/esironal/dashgum-template).

Created by [Jack Burgess](https://github.com/jack828).

## License

MIT

Please feel free to improve this, I'd really appreciate a pull request or two.
