# Sass Unpack

Sass Unpack cut a sass project in multiple css files

## Install

Install with [npm](https://npmjs.org/package/sass-unpack)

```
npm install --save-dev sass-unpack
```

## Usage

Usage as a Node library:

```js
var fs = require('fs'),
	path = require('path'),
	paths  = require('./paths');

var SassUnpack = require('sass-unpack');

var Package = new SassUnpack({
		src : paths.build.css
});

var map = Package.unpackTo({
		dest :paths.build.dest
});

fs.writeFileSync(path.resolve(paths.build.dir) + '/href.json', JSON.stringify(map.href));

fs.writeFileSync(path.resolve(paths.build.dir) + '/sass.json',JSON.stringify(map.sass) );
```

Usage as a command line tool:

```
$ sassunpack --help
Usage: sassunpack -f <file> [options]

Options:
	-d, --destination  Path to save the output ( map.json + href.json + files)
					[défaut: "/Volumes/WORKSPACE/Dropbox/www/dev/project/photobox/studio"]
	-f, --file         File to unpack                                     [requis]
	-n, --name         Output directory name                       [défaut: "dev"]
	-v, --verbose      Debug                                       [défaut: false]

Exemples:
	sassunpack -f foo.scss  Cut a sass project in multiple css files

```



## Authors

[Steed Monteiro](http://twitter.com/SteedMonteiro).

## License

BSD
