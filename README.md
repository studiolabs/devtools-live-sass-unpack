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
    src : paths.build.css.screen
});

var map = Package.unpackTo({
    dest :paths.build.dest,
    urlRoot : '/'+paths.THEME
  });

fs.writeFileSync(path.resolve(paths.build.dir) + '/href.json', JSON.stringify(map.href));
fs.writeFileSync(path.resolve(paths.build.dir) + '/sass.json',JSON.stringify(map.sass) );

```

## Authors

[Steed Monteiro](http://twitter.com/SteedMonteiro).

## License

MIT
